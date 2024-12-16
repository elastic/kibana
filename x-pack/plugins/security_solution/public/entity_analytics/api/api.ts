/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  ENTITY_STORE_INTERNAL_PRIVILEGES_URL,
  LIST_ENTITIES_URL,
} from '../../../common/entity_analytics/entity_store/constants';
import type { UploadAssetCriticalityRecordsResponse } from '../../../common/api/entity_analytics/asset_criticality/upload_asset_criticality_csv.gen';
import type { DisableRiskEngineResponse } from '../../../common/api/entity_analytics/risk_engine/engine_disable_route.gen';
import type { RiskEngineStatusResponse } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import type { InitRiskEngineResponse } from '../../../common/api/entity_analytics/risk_engine/engine_init_route.gen';
import type { EnableRiskEngineResponse } from '../../../common/api/entity_analytics/risk_engine/engine_enable_route.gen';
import type { RiskEngineScheduleNowResponse } from '../../../common/api/entity_analytics/risk_engine/engine_schedule_now_route.gen';
import type {
  RiskScoresPreviewRequest,
  RiskScoresPreviewResponse,
} from '../../../common/api/entity_analytics/risk_engine/preview_route.gen';
import type {
  RiskScoresEntityCalculationRequest,
  RiskScoresEntityCalculationResponse,
} from '../../../common/api/entity_analytics/risk_engine/entity_calculation_route.gen';
import type {
  AssetCriticalityRecord,
  EntityAnalyticsPrivileges,
} from '../../../common/api/entity_analytics';
import type { RiskScoreEntity } from '../../../common/search_strategy';
import {
  RISK_ENGINE_STATUS_URL,
  RISK_SCORE_PREVIEW_URL,
  RISK_ENGINE_ENABLE_URL,
  RISK_ENGINE_DISABLE_URL,
  RISK_ENGINE_INIT_URL,
  RISK_ENGINE_PRIVILEGES_URL,
  ASSET_CRITICALITY_INTERNAL_PRIVILEGES_URL,
  ASSET_CRITICALITY_PUBLIC_URL,
  RISK_SCORE_INDEX_STATUS_API_URL,
  RISK_ENGINE_SETTINGS_URL,
  ASSET_CRITICALITY_PUBLIC_CSV_UPLOAD_URL,
  RISK_SCORE_ENTITY_CALCULATION_URL,
  API_VERSIONS,
  RISK_ENGINE_CLEANUP_URL,
  RISK_ENGINE_SCHEDULE_NOW_URL,
  RISK_ENGINE_CONFIGURE_SO_URL,
} from '../../../common/constants';
import type { SnakeToCamelCase } from '../common/utils';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import type { ReadRiskEngineSettingsResponse } from '../../../common/api/entity_analytics/risk_engine';
import type { ListEntitiesResponse } from '../../../common/api/entity_analytics/entity_store/entities/list_entities.gen';
import { type ListEntitiesRequestQuery } from '../../../common/api/entity_analytics/entity_store/entities/list_entities.gen';

export interface DeleteAssetCriticalityResponse {
  deleted: true;
}
export const useEntityAnalyticsRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    /**
     * Fetches preview risks scores
     */
    const fetchRiskScorePreview = ({
      signal,
      params,
    }: {
      signal?: AbortSignal;
      params: RiskScoresPreviewRequest;
    }) =>
      http.fetch<RiskScoresPreviewResponse>(RISK_SCORE_PREVIEW_URL, {
        version: '1',
        method: 'POST',
        body: JSON.stringify(params),
        signal,
      });

    /**
     * Fetches entities from the Entity Store
     */
    const fetchEntitiesList = ({
      signal,
      params,
    }: {
      signal?: AbortSignal;
      params: FetchEntitiesListParams;
    }) =>
      http.fetch<ListEntitiesResponse>(LIST_ENTITIES_URL, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        query: {
          entities_types: params.entitiesTypes,
          sort_field: params.sortField,
          sort_order: params.sortOrder,
          page: params.page,
          per_page: params.perPage,
          filterQuery: params.filterQuery,
        },
        signal,
      });

    /**
     * Fetches risks engine status
     */
    const fetchRiskEngineStatus = ({ signal }: { signal?: AbortSignal }) =>
      http.fetch<RiskEngineStatusResponse>(RISK_ENGINE_STATUS_URL, {
        version: '1',
        method: 'GET',
        signal,
      });

    /**
     * Init risk score engine
     */
    const initRiskEngine = () =>
      http.fetch<InitRiskEngineResponse>(RISK_ENGINE_INIT_URL, {
        version: '1',
        method: 'POST',
      });

    /**
     * Enable risk score engine
     */
    const enableRiskEngine = () =>
      http.fetch<EnableRiskEngineResponse>(RISK_ENGINE_ENABLE_URL, {
        version: '1',
        method: 'POST',
      });

    /**
     * Disable risk score engine
     */
    const disableRiskEngine = () =>
      http.fetch<DisableRiskEngineResponse>(RISK_ENGINE_DISABLE_URL, {
        version: '1',
        method: 'POST',
      });

    /**
     * Enable risk score engine
     */
    const scheduleNowRiskEngine = () =>
      http.fetch<RiskEngineScheduleNowResponse>(RISK_ENGINE_SCHEDULE_NOW_URL, {
        version: API_VERSIONS.public.v1,
        method: 'POST',
      });

    /**
     * Calculate and stores risk score for an entity
     */
    const calculateEntityRiskScore = (params: RiskScoresEntityCalculationRequest) => {
      return http.fetch<RiskScoresEntityCalculationResponse>(RISK_SCORE_ENTITY_CALCULATION_URL, {
        version: '1',
        method: 'POST',
        body: JSON.stringify(params),
      });
    };

    /**
     * Get risk engine privileges
     */
    const fetchRiskEnginePrivileges = () =>
      http.fetch<EntityAnalyticsPrivileges>(RISK_ENGINE_PRIVILEGES_URL, {
        version: '1',
        method: 'GET',
      });

    /**
     * Get asset criticality privileges
     */
    const fetchAssetCriticalityPrivileges = () =>
      http.fetch<EntityAnalyticsPrivileges>(ASSET_CRITICALITY_INTERNAL_PRIVILEGES_URL, {
        version: '1',
        method: 'GET',
      });

    /**
     * Get Entity Store privileges
     */
    const fetchEntityStorePrivileges = () =>
      http.fetch<EntityAnalyticsPrivileges>(ENTITY_STORE_INTERNAL_PRIVILEGES_URL, {
        version: '1',
        method: 'GET',
      });

    /**
     * Create asset criticality
     */
    const createAssetCriticality = async (
      params: Pick<AssetCriticality, 'idField' | 'idValue' | 'criticalityLevel'> & {
        refresh?: 'wait_for';
      }
    ): Promise<AssetCriticalityRecord> =>
      http.fetch<AssetCriticalityRecord>(ASSET_CRITICALITY_PUBLIC_URL, {
        version: API_VERSIONS.public.v1,
        method: 'POST',
        body: JSON.stringify({
          id_value: params.idValue,
          id_field: params.idField,
          criticality_level: params.criticalityLevel,
          refresh: params.refresh,
        }),
      });

    const deleteAssetCriticality = async (
      params: Pick<AssetCriticality, 'idField' | 'idValue'> & {
        refresh?: 'wait_for';
      }
    ): Promise<{ deleted: true }> => {
      await http.fetch(ASSET_CRITICALITY_PUBLIC_URL, {
        version: API_VERSIONS.public.v1,
        method: 'DELETE',
        query: {
          id_value: params.idValue,
          id_field: params.idField,
          refresh: params.refresh,
        },
      });

      // spoof a response to allow us to better distnguish a delete from a create in use_asset_criticality.ts
      return { deleted: true };
    };

    /**
     * Get asset criticality
     */
    const fetchAssetCriticality = async (
      params: Pick<AssetCriticality, 'idField' | 'idValue'>
    ): Promise<AssetCriticalityRecord> => {
      return http.fetch<AssetCriticalityRecord>(ASSET_CRITICALITY_PUBLIC_URL, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        query: { id_value: params.idValue, id_field: params.idField },
      });
    };

    const uploadAssetCriticalityFile = async (
      fileContent: string,
      fileName: string
    ): Promise<UploadAssetCriticalityRecordsResponse> => {
      const file = new File([new Blob([fileContent])], fileName, {
        type: 'text/csv',
      });
      const body = new FormData();
      body.append('file', file);

      return http.fetch<UploadAssetCriticalityRecordsResponse>(
        ASSET_CRITICALITY_PUBLIC_CSV_UPLOAD_URL,
        {
          version: API_VERSIONS.public.v1,
          method: 'POST',
          headers: {
            'Content-Type': undefined, // Lets the browser set the appropriate content type
          },
          body,
        }
      );
    };

    const getRiskScoreIndexStatus = ({
      query,
      signal,
    }: {
      query: {
        indexName: string;
        entity: RiskScoreEntity;
      };
      signal?: AbortSignal;
    }): Promise<{
      isDeprecated: boolean;
      isEnabled: boolean;
    }> =>
      http.fetch<{ isDeprecated: boolean; isEnabled: boolean }>(RISK_SCORE_INDEX_STATUS_API_URL, {
        version: '1',
        method: 'GET',
        query,
        asSystemRequest: true,
        signal,
      });

    /**
     * Fetches risk engine settings
     */
    const fetchRiskEngineSettings = () =>
      http.fetch<ReadRiskEngineSettingsResponse>(RISK_ENGINE_SETTINGS_URL, {
        version: '1',
        method: 'GET',
      });

    /**
     * Deletes Risk engine installation and associated data
     */

    const cleanUpRiskEngine = () =>
      http.fetch(RISK_ENGINE_CLEANUP_URL, {
        version: '1',
        method: 'DELETE',
      });

    const updateSavedObjectConfiguration = (params: {}) => {
      http.fetch(RISK_ENGINE_CONFIGURE_SO_URL, {
        version: API_VERSIONS.public.v1,
        method: 'PUT',
        body: JSON.stringify(params),
      });
    };

    return {
      fetchRiskScorePreview,
      fetchRiskEngineStatus,
      initRiskEngine,
      enableRiskEngine,
      disableRiskEngine,
      scheduleNowRiskEngine,
      fetchRiskEnginePrivileges,
      fetchAssetCriticalityPrivileges,
      fetchEntityStorePrivileges,
      createAssetCriticality,
      deleteAssetCriticality,
      fetchAssetCriticality,
      uploadAssetCriticalityFile,
      getRiskScoreIndexStatus,
      fetchRiskEngineSettings,
      calculateEntityRiskScore,
      cleanUpRiskEngine,
      fetchEntitiesList,
      updateSavedObjectConfiguration,
    };
  }, [http]);
};

export type AssetCriticality = SnakeToCamelCase<AssetCriticalityRecord>;

export type FetchEntitiesListParams = SnakeToCamelCase<ListEntitiesRequestQuery>;
