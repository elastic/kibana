/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { enrichEvents } from '.';
import { searchEnrichments } from './search_enrichments';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { createAlert } from './__mocks__/alerts';
import { getIsHostRiskScoreAvailable } from './enrichment_by_type/host_risk';

import { getIsUserRiskScoreAvailable } from './enrichment_by_type/user_risk';

jest.mock('./search_enrichments', () => ({
  searchEnrichments: jest.fn(),
}));
const mockSearchEnrichments = searchEnrichments as jest.Mock;

jest.mock('./enrichment_by_type/host_risk', () => ({
  ...jest.requireActual('./enrichment_by_type/host_risk'),
  getIsHostRiskScoreAvailable: jest.fn(),
}));
const mockGetIsHostRiskScoreAvailable = getIsHostRiskScoreAvailable as jest.Mock;

jest.mock('./enrichment_by_type/user_risk', () => ({
  ...jest.requireActual('./enrichment_by_type/user_risk'),
  getIsUserRiskScoreAvailable: jest.fn(),
}));
const mockGetIsUserRiskScoreAvailable = getIsUserRiskScoreAvailable as jest.Mock;

const hostEnrichmentResponse = [
  {
    fields: {
      'host.name': ['host name 1'],
      'host.risk.calculated_level': ['Low'],
      'host.risk.calculated_score_norm': [20],
    },
  },
  {
    fields: {
      'host.name': ['host name 3'],
      'host.risk.calculated_level': ['Critical'],
      'host.risk.calculated_score_norm': [90],
    },
  },
];

const userEnrichmentResponse = [
  {
    fields: {
      'user.name': ['user name 1'],
      'user.risk.calculated_level': ['Moderate'],
      'user.risk.calculated_score_norm': [50],
    },
  },
  {
    fields: {
      'user.name': ['user name 2'],
      'user.risk.calculated_level': ['Critical'],
      'user.risk.calculated_score_norm': [90],
    },
  },
];

describe('enrichEvents', () => {
  let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;
  let alertServices: RuleExecutorServicesMock;
  const createEntity = (entity: string, name: string) => ({
    [entity]: { name },
  });
  beforeEach(() => {
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
    alertServices = alertsMock.createRuleExecutorServices();
  });

  it('return the same events, if risk indexes are not available', async () => {
    mockSearchEnrichments.mockImplementation(() => []);
    mockGetIsUserRiskScoreAvailable.mockImplementation(() => false);
    mockGetIsHostRiskScoreAvailable.mockImplementation(() => false);
    const events = [
      createAlert('1', createEntity('host', 'host name')),
      createAlert('2', createEntity('user', 'user name')),
    ];
    const enrichedEvents = await enrichEvents({
      logger: ruleExecutionLogger,
      services: alertServices,
      events,
      spaceId: 'default',
    });

    expect(enrichedEvents).toEqual(events);
  });

  it('return the same events, if there no fields', async () => {
    mockSearchEnrichments.mockImplementation(() => []);
    mockGetIsUserRiskScoreAvailable.mockImplementation(() => true);
    mockGetIsHostRiskScoreAvailable.mockImplementation(() => true);
    const events = [createAlert('1'), createAlert('2')];
    const enrichedEvents = await enrichEvents({
      logger: ruleExecutionLogger,
      services: alertServices,
      events,
      spaceId: 'default',
    });

    expect(enrichedEvents).toEqual(events);
  });

  it('return enriched events', async () => {
    mockSearchEnrichments
      .mockReturnValueOnce(hostEnrichmentResponse)
      .mockReturnValueOnce(userEnrichmentResponse);
    mockGetIsUserRiskScoreAvailable.mockImplementation(() => true);
    mockGetIsHostRiskScoreAvailable.mockImplementation(() => true);

    const enrichedEvents = await enrichEvents({
      logger: ruleExecutionLogger,
      services: alertServices,
      events: [
        createAlert('1', {
          ...createEntity('host', 'host name 1'),
          ...createEntity('user', 'user name 1'),
        }),
        createAlert('2', createEntity('user', 'user name 2')),
      ],
      spaceId: 'default',
    });

    expect(enrichedEvents).toEqual([
      createAlert('1', {
        host: {
          name: 'host name 1',
          risk: {
            calculated_level: 'Low',
            calculated_score_norm: 20,
          },
        },
        user: {
          name: 'user name 1',
          risk: {
            calculated_level: 'Moderate',
            calculated_score_norm: 50,
          },
        },
      }),
      createAlert('2', {
        user: {
          name: 'user name 2',
          risk: {
            calculated_level: 'Critical',
            calculated_score_norm: 90,
          },
        },
      }),
    ]);
  });

  it('if some enrichments failed, another work as expected', async () => {
    mockSearchEnrichments
      .mockImplementationOnce(() => {
        throw new Error('1');
      })
      .mockImplementationOnce(() => userEnrichmentResponse);
    mockGetIsUserRiskScoreAvailable.mockImplementation(() => true);
    mockGetIsHostRiskScoreAvailable.mockImplementation(() => true);

    const enrichedEvents = await enrichEvents({
      logger: ruleExecutionLogger,
      services: alertServices,
      events: [
        createAlert('1', {
          ...createEntity('host', 'host name 1'),
          ...createEntity('user', 'user name 1'),
        }),
        createAlert('2', createEntity('user', 'user name 2')),
      ],
      spaceId: 'default',
    });

    expect(enrichedEvents).toEqual([
      createAlert('1', {
        host: {
          name: 'host name 1',
        },
        user: {
          name: 'user name 1',
          risk: {
            calculated_level: 'Moderate',
            calculated_score_norm: 50,
          },
        },
      }),
      createAlert('2', {
        user: {
          name: 'user name 2',
          risk: {
            calculated_level: 'Critical',
            calculated_score_norm: 90,
          },
        },
      }),
    ]);
  });
});
