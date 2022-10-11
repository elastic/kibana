/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { Blob } from 'buffer';
import type { UseAppToasts } from '../../../../../common/hooks/use_app_toasts';
import {
  performBulkAction,
  performBulkExportAction,
} from '../../../../containers/detection_engine/rules';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../../common/lib/telemetry';
import { BulkAction } from '../../../../../../common/detection_engine/schemas/request';
import { downloadBlob } from '../../../../../common/utils/download_blob';

import { bulkExportRules, performTrackableBulkAction } from './actions';

jest.mock('../../../../containers/detection_engine/rules');
jest.mock('../../../../../common/lib/telemetry');
jest.mock('../../../../../common/utils/download_blob');

describe('Rule Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
        await performTrackableBulkAction(BulkAction.enable, 'some query');

        expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.SIEM_RULE_ENABLED);
      });

      test('sends disable action telemetry', async () => {
        await performTrackableBulkAction(BulkAction.disable, 'some query');

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

  describe('bulkExportRules', () => {
    const createExportRulesBlob = (exported: number, missing: number) =>
      new Blob(
        [
          [
            '{}',
            '{}',
            JSON.stringify({
              exported_rules_count: exported,
              missing_rules_count: missing,
              missing_rules: [],
            }),
          ].join('\n'),
        ],
        { type: 'application/json' }
      );
    let appToasts: UseAppToasts;

    beforeEach(() => {
      appToasts = {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      } as unknown as UseAppToasts;
    });

    test('downloads rules', async () => {
      const exportRulesBlob = createExportRulesBlob(2, 0);

      (performBulkExportAction as jest.Mock).mockResolvedValue(exportRulesBlob);

      await bulkExportRules(['ruleId1', 'ruleId2'], appToasts);

      expect(downloadBlob).toHaveBeenCalledWith(exportRulesBlob, 'rules_export.ndjson');
      expect(appToasts.addSuccess).toHaveBeenCalled();
    });

    test('downloads rules by default if one failed', async () => {
      const exportRulesBlob = createExportRulesBlob(1, 1);

      (performBulkExportAction as jest.Mock).mockResolvedValue(exportRulesBlob);

      await bulkExportRules(['ruleId1', 'ruleId2'], appToasts);

      expect(downloadBlob).toHaveBeenCalledWith(exportRulesBlob, 'rules_export.ndjson');
      expect(appToasts.addSuccess).toHaveBeenCalled();
    });

    test('downloads rules if one failed', async () => {
      const exportRulesBlob = createExportRulesBlob(1, 1);

      (performBulkExportAction as jest.Mock).mockResolvedValue(exportRulesBlob);

      await bulkExportRules(['ruleId1', 'ruleId2'], appToasts, async () => true);

      expect(downloadBlob).toHaveBeenCalledWith(exportRulesBlob, 'rules_export.ndjson');
      expect(appToasts.addSuccess).toHaveBeenCalled();
    });

    test('exits if one rule failed and failure handler resolved to false', async () => {
      const exportRulesBlob = createExportRulesBlob(1, 1);

      (performBulkExportAction as jest.Mock).mockResolvedValue(exportRulesBlob);

      await bulkExportRules(['ruleId1', 'ruleId2'], appToasts, async () => false);

      expect(downloadBlob).not.toHaveBeenCalled();
      expect(appToasts.addError).not.toHaveBeenCalled();
    });

    test('errors', async () => {
      (performBulkExportAction as jest.Mock).mockRejectedValue(new Error('some error'));

      await bulkExportRules(['ruleId1', 'ruleId2'], appToasts);

      expect(downloadBlob).not.toHaveBeenCalled();
      expect(appToasts.addError).toHaveBeenCalled();
    });
  });
});
