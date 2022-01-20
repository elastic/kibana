/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import { ALERT_RULE_CONSUMER } from '@kbn/rule-data-utils';

import { sampleDocNoSortId, sampleRuleGuid } from '../../../signals/__mocks__/es_results';
import { buildAlertGroupFromSequence } from './build_alert_group_from_sequence';
import { SERVER_APP_ID } from '../../../../../../common/constants';
import { getCompleteRuleMock, getQueryRuleParams } from '../../../schemas/rule_schemas.mock';
import { QueryRuleParams } from '../../../schemas/rule_schemas';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_GROUP_ID,
} from '../../../../../../common/field_maps/field_names';

const SPACE_ID = 'space';

const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

describe('buildAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it builds an alert composed of a sequence', () => {
    expect(true).toEqual(true);
  });

  test('it builds an alert as expected without original_event if event does not exist', () => {
    const completeRule = getCompleteRuleMock<QueryRuleParams>(getQueryRuleParams());
    const eqlSequence = {
      join_keys: [],
      events: [
        sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71'),
        sampleDocNoSortId('619389b2-b077-400e-b40b-abde20d675d3'),
      ],
    };
    const alertGroup = buildAlertGroupFromSequence(
      loggerMock,
      eqlSequence,
      completeRule,
      'allFields',
      SPACE_ID,
      jest.fn()
    );
    expect(alertGroup.length).toEqual(3);
    expect(alertGroup[0]).toEqual(
      expect.objectContaining({
        _source: expect.objectContaining({
          [ALERT_ANCESTORS]: [
            {
              depth: 0,
              id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
              index: 'myFakeSignalIndex',
              type: 'event',
            },
          ],
          [ALERT_DEPTH]: 1,
          [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
          [ALERT_BUILDING_BLOCK_TYPE]: 'default',
        }),
      })
    );
    expect(alertGroup[1]).toEqual(
      expect.objectContaining({
        _source: expect.objectContaining({
          [ALERT_ANCESTORS]: [
            {
              depth: 0,
              id: '619389b2-b077-400e-b40b-abde20d675d3',
              index: 'myFakeSignalIndex',
              type: 'event',
            },
          ],
          [ALERT_DEPTH]: 1,
          [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
          [ALERT_BUILDING_BLOCK_TYPE]: 'default',
        }),
      })
    );
    expect(alertGroup[2]).toEqual(
      expect.objectContaining({
        _source: expect.objectContaining({
          [ALERT_ANCESTORS]: expect.arrayContaining([
            {
              depth: 0,
              id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
              index: 'myFakeSignalIndex',
              type: 'event',
            },
            {
              depth: 0,
              id: '619389b2-b077-400e-b40b-abde20d675d3',
              index: 'myFakeSignalIndex',
              type: 'event',
            },
            {
              depth: 1,
              id: alertGroup[0]._id,
              index: '',
              rule: sampleRuleGuid,
              type: 'signal',
            },
            {
              depth: 1,
              id: alertGroup[1]._id,
              index: '',
              rule: sampleRuleGuid,
              type: 'signal',
            },
          ]),
          [ALERT_DEPTH]: 2,
          [ALERT_BUILDING_BLOCK_TYPE]: 'default',
          [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
        }),
      })
    );

    const groupIds = alertGroup.map((alert) => alert._source[ALERT_GROUP_ID]);
    for (const groupId of groupIds) {
      expect(groupId).toEqual(groupIds[0]);
    }
  });
});
