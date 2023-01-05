/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { createSingleFieldMatchEnrichment } from './create_single_field_match_enrichment';
import { searchEnrichments } from './search_enrichments';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { createAlert } from './__mocks__/alerts';
import type { EnrichmentFunction } from './types';

jest.mock('./search_enrichments', () => ({
  searchEnrichments: jest.fn(),
}));
const mockSearchEnrichments = searchEnrichments as jest.Mock;

describe('createSingleFieldMatchEnrichment', () => {
  let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;
  let alertServices: RuleExecutorServicesMock;

  beforeEach(() => {
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
    alertServices = alertsMock.createRuleExecutorServices();
  });

  afterEach(() => {
    mockSearchEnrichments.mockClear();
  });

  it('return empty object if there no enrichments for events', async () => {
    mockSearchEnrichments.mockImplementation(() => []);

    const enrichmentResult = await createSingleFieldMatchEnrichment({
      name: 'host',
      index: ['host-enrichment'],
      events: [createAlert('1')],
      logger: ruleExecutionLogger,
      services: alertServices,
      mappingField: {
        eventField: 'host.name',
        enrichmentField: 'host.name',
      },
      enrichmentResponseFields: ['host.name'],
      createEnrichmentFunction: () => (a) => a,
    });

    expect(enrichmentResult).toEqual({});
  });

  it('return map with events to enrich', async () => {
    mockSearchEnrichments.mockImplementation(() => [
      {
        fields: {
          'host.name': ['host name 1'],
        },
      },
      {
        fields: {
          'host.name': ['host name 3'],
        },
      },
    ]);

    const enrichFunction: EnrichmentFunction = (a) => a;

    const enrichmentResult = await createSingleFieldMatchEnrichment({
      name: 'host',
      index: ['host-enrichment'],
      events: [
        createAlert('1', { host: { name: 'host name 1' } }),
        createAlert('2', { host: { name: 'host name 2' } }),
        createAlert('3'),
      ],
      logger: ruleExecutionLogger,
      services: alertServices,
      enrichmentResponseFields: ['host.name'],
      mappingField: {
        eventField: 'host.name',
        enrichmentField: 'host.name',
      },
      createEnrichmentFunction: () => enrichFunction,
    });

    expect(enrichmentResult).toEqual({ 1: [enrichFunction] });
  });

  it('make request only with unique values', async () => {
    mockSearchEnrichments.mockImplementation(() => [
      {
        fields: {
          'host.name': ['host name 1'],
        },
      },
      {
        fields: {
          'host.name': ['host name 3'],
        },
      },
    ]);

    const enrichFunction: EnrichmentFunction = (a) => a;

    await createSingleFieldMatchEnrichment({
      name: 'host',
      index: ['host-enrichment'],
      events: [
        createAlert('1', { host: { name: 'host name 1' } }),
        createAlert('2', { host: { name: 'host name 1' } }),
        createAlert('3', { host: { name: 'host name 1' } }),
      ],
      enrichmentResponseFields: ['host.name'],
      logger: ruleExecutionLogger,
      services: alertServices,
      mappingField: {
        eventField: 'host.name',
        enrichmentField: 'host.name',
      },
      createEnrichmentFunction: () => enrichFunction,
    });

    expect(
      mockSearchEnrichments.mock.calls[mockSearchEnrichments.mock.calls.length - 1][0].query.query
        .bool.should
    ).toEqual([{ match: { 'host.name': { minimum_should_match: 1, query: 'host name 1' } } }]);
  });

  it('return empty object if there some exception happen', async () => {
    mockSearchEnrichments.mockImplementation(() => {
      throw new Error('1');
    });

    const enrichFunction: EnrichmentFunction = (a) => a;

    const enrichmentResult = await createSingleFieldMatchEnrichment({
      name: 'host',
      index: ['host-enrichment'],
      events: [createAlert('1', { host: { name: 'host name 1' } })],
      logger: ruleExecutionLogger,
      services: alertServices,
      enrichmentResponseFields: ['host.name'],
      mappingField: {
        eventField: 'host.name',
        enrichmentField: 'host.name',
      },
      createEnrichmentFunction: () => enrichFunction,
    });

    expect(enrichmentResult).toEqual({});
  });

  it('skip request to search ernichments if there no fields', async () => {
    mockSearchEnrichments.mockImplementation(() => {});

    const enrichFunction: EnrichmentFunction = (a) => a;

    await createSingleFieldMatchEnrichment({
      name: 'host',
      index: ['host-enrichment'],
      events: [createAlert('1')],
      logger: ruleExecutionLogger,
      services: alertServices,
      enrichmentResponseFields: ['host.name'],
      mappingField: {
        eventField: 'host.name',
        enrichmentField: 'host.name',
      },
      createEnrichmentFunction: () => enrichFunction,
    });

    expect(mockSearchEnrichments).not.toHaveBeenCalled();
  });

  it('make several request to enrichment index, if there more than 1000 values to search', async () => {
    mockSearchEnrichments.mockImplementation(() =>
      [...Array(3000).keys()].map((item) => ({
        fields: { 'host.name': [`host name ${item}`] },
      }))
    );

    const events = [...Array(3000).keys()].map((item) =>
      createAlert(item.toString(), { host: { name: `host name ${item}` } })
    );
    const enrichFunction: EnrichmentFunction = (a) => a;

    const enrichmentResult = await createSingleFieldMatchEnrichment({
      name: 'host',
      index: ['host-enrichment'],
      events,
      logger: ruleExecutionLogger,
      enrichmentResponseFields: ['host.name'],
      services: alertServices,
      mappingField: {
        eventField: 'host.name',
        enrichmentField: 'host.name',
      },
      createEnrichmentFunction: () => enrichFunction,
    });

    expect(mockSearchEnrichments.mock.calls.length).toEqual(3);
    expect(Object.keys(enrichmentResult).length).toEqual(3000);
  });
});
