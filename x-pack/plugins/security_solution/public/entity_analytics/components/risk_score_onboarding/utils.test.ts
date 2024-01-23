/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import {
  getIngestPipelineName,
  getLegacyIngestPipelineName,
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
} from '../../../../common/utils/risk_score_modules';
import {
  bulkDeletePrebuiltSavedObjects,
  bulkCreatePrebuiltSavedObjects,
} from '../../deprecated_risk_engine/api';

import * as api from '../../deprecated_risk_engine/api';
import {
  installRiskScoreModule,
  restartRiskScoreTransforms,
  uninstallRiskScoreModule,
} from './utils';

jest.mock('../../deprecated_risk_engine/api');

const mockHttp = {
  post: jest.fn(),
} as unknown as HttpSetup;
const mockSpaceId = 'customSpace';
const mockTimerange = {
  from: 'startDate',
  to: 'endDate',
};
const mockRefetch = jest.fn();
describe.each([RiskScoreEntity.host, RiskScoreEntity.user])(
  `installRiskScoreModule - %s`,
  (riskScoreEntity) => {
    beforeAll(async () => {
      await installRiskScoreModule({
        http: mockHttp,
        refetch: mockRefetch,
        spaceId: mockSpaceId,
        timerange: mockTimerange,
        riskScoreEntity,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it(`installRiskScore`, () => {
      expect((api.installRiskScore as jest.Mock).mock.calls[0][0].options.riskScoreEntity).toEqual(
        riskScoreEntity
      );
    });

    it(`Create ${riskScoreEntity} dashboards`, () => {
      expect(
        (bulkCreatePrebuiltSavedObjects as jest.Mock).mock.calls[0][0].options.templateName
      ).toEqual(`${riskScoreEntity}RiskScoreDashboards`);
    });

    it('Refresh module', () => {
      expect(mockRefetch).toBeCalled();
    });
  }
);

describe.each([[RiskScoreEntity.host], [RiskScoreEntity.user]])(
  'uninstallRiskScoreModule - %s',
  (riskScoreEntity) => {
    beforeAll(async () => {
      await uninstallRiskScoreModule({
        http: mockHttp,
        spaceId: mockSpaceId,
        riskScoreEntity,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it(`Delete ${riskScoreEntity} dashboards`, () => {
      expect(
        (bulkDeletePrebuiltSavedObjects as jest.Mock).mock.calls[0][0].options.templateName
      ).toEqual(`${riskScoreEntity}RiskScoreDashboards`);
    });

    it('Delete Transforms', () => {
      expect((api.deleteTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
        getRiskScorePivotTransformId(riskScoreEntity, mockSpaceId),
        getRiskScoreLatestTransformId(riskScoreEntity, mockSpaceId),
      ]);
    });

    it('Delete legacy ingest pipelines', () => {
      expect((api.deleteIngestPipelines as jest.Mock).mock.calls[0][0].names).toEqual(
        [
          getLegacyIngestPipelineName(riskScoreEntity),
          getIngestPipelineName(riskScoreEntity, mockSpaceId),
        ].join(',')
      );
    });

    it('Delete legacy stored scripts', () => {
      if (riskScoreEntity === RiskScoreEntity.user) {
        expect((api.deleteStoredScripts as jest.Mock).mock.calls[0][0].ids).toMatchInlineSnapshot(`
          Array [
            "ml_userriskscore_levels_script",
            "ml_userriskscore_map_script",
            "ml_userriskscore_reduce_script",
            "ml_userriskscore_levels_script_customSpace",
            "ml_userriskscore_map_script_customSpace",
            "ml_userriskscore_reduce_script_customSpace",
          ]
        `);
      } else {
        expect((api.deleteStoredScripts as jest.Mock).mock.calls[0][0].ids).toMatchInlineSnapshot(`
          Array [
            "ml_hostriskscore_levels_script",
            "ml_hostriskscore_init_script",
            "ml_hostriskscore_map_script",
            "ml_hostriskscore_reduce_script",
            "ml_hostriskscore_levels_script_customSpace",
            "ml_hostriskscore_init_script_customSpace",
            "ml_hostriskscore_map_script_customSpace",
            "ml_hostriskscore_reduce_script_customSpace",
          ]
        `);
      }
    });
  }
);

describe.each([[RiskScoreEntity.host], [RiskScoreEntity.user]])(
  'Restart Transforms - %s',
  (riskScoreEntity) => {
    beforeAll(async () => {
      await restartRiskScoreTransforms({
        http: mockHttp,
        refetch: mockRefetch,
        riskScoreEntity,
        spaceId: mockSpaceId,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it('Restart Transforms with correct Ids', () => {
      expect((api.stopTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
        getRiskScorePivotTransformId(riskScoreEntity, mockSpaceId),
        getRiskScoreLatestTransformId(riskScoreEntity, mockSpaceId),
      ]);

      expect((api.startTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
        getRiskScorePivotTransformId(riskScoreEntity, mockSpaceId),
        getRiskScoreLatestTransformId(riskScoreEntity, mockSpaceId),
      ]);
    });

    it('Refresh module', () => {
      expect(mockRefetch).toBeCalled();
    });
  }
);
