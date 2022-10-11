/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performBulkAction } from '../../../../containers/detection_engine/rules';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../../common/lib/telemetry';
import { BulkAction } from '../../../../../../common/detection_engine/schemas/request';

import { performTrackableBulkAction } from './actions';

jest.mock('../../../../containers/detection_engine/rules');
jest.mock('../../../../../common/lib/telemetry');

describe('Rule Actions', () => {
  describe('performTrackableBulkAction', () => {
    describe('for an immutable rule', () => {
      beforeEach(() => {
        (performBulkAction as jest.Mock).mockResolvedValue({
          attributes: {
            results: {
              updated: [
                {
                  immutable: true,
                },
              ],
            },
          },
        });
      });

      test('sends enable action telemetry', async () => {
        await performTrackableBulkAction('enable', 'some query');

        expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.SIEM_RULE_ENABLED);
      });

      test('sends disable action telemetry', async () => {
        await performTrackableBulkAction('disable', 'some query');

        expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.SIEM_RULE_DISABLED);
      });
    });

    describe('for a mutable rule', () => {
      beforeEach(() => {
        (performBulkAction as jest.Mock).mockResolvedValue({
          attributes: {
            results: {
              updated: [
                {
                  immutable: false,
                },
              ],
            },
          },
        });
      });

      test('sends enable action telemetry', async () => {
        await performTrackableBulkAction(BulkAction.enable, 'some query');

        expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.CUSTOM_RULE_ENABLED);
      });

      test('sends disable action telemetry', async () => {
        await performTrackableBulkAction(BulkAction.disable, 'some query');

        expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.CUSTOM_RULE_DISABLED);
      });
    });
  });
});
