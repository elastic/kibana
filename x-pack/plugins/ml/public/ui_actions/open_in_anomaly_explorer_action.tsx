/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import { ML_ENTITY_FIELD_OPERATIONS } from '@kbn/ml-anomaly-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type {
  EmbeddableApiContext,
  HasParentApi,
  HasType,
  PublishesLocalUnifiedSearch,
} from '@kbn/presentation-publishing';
import { apiHasType, apiIsOfType } from '@kbn/presentation-publishing';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { ML_APP_LOCATOR } from '../../common/constants/locator';
import type { ExplorerAppState } from '../../common/types/locator';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type {
  AnomalyExplorerChartsEmbeddableType,
  AnomalySwimLaneEmbeddableType,
} from '../embeddables';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
} from '../embeddables';
import type { MlCoreSetup } from '../plugin';
import type { JobId } from '../shared';

export interface AnomalyChartsFieldSelectionApi {
  // Props from embeddable output
  entityFields: MlEntityField[];
}

export interface SwimLaneDrilldownApi {
  // Props from embeddable input
  viewBy: string;
  // Props from embeddable output
  perPage: number;
  fromPage: number;
}

export interface OpenInAnomalyExplorerSwimLaneActionContext extends EmbeddableApiContext {
  embeddable: OpenInAnomalyExplorerFromSwimLaneActionApi;
  /**
   * Optional data provided by swim lane selection
   */
  data?: AppStateSelectedCells;
}

export interface OpenInAnomalyExplorerAnomalyChartsActionContext extends EmbeddableApiContext {
  embeddable: OpenInAnomalyExplorerFromAnomalyChartActionApi;
  /**
   * Optional fields selected using anomaly charts
   */
  data?: MlEntityField[];
}

export type OpenInAnomalyExplorerBaseActionApi = Partial<
  HasParentApi<HasType> & PublishesLocalUnifiedSearch & { jobIds: JobId[] }
>;

export type OpenInAnomalyExplorerFromSwimLaneActionApi = HasType<AnomalySwimLaneEmbeddableType> &
  OpenInAnomalyExplorerBaseActionApi &
  SwimLaneDrilldownApi;

export type OpenInAnomalyExplorerFromAnomalyChartActionApi =
  HasType<AnomalyExplorerChartsEmbeddableType> &
    OpenInAnomalyExplorerBaseActionApi &
    AnomalyChartsFieldSelectionApi;

export const OPEN_IN_ANOMALY_EXPLORER_ACTION = 'openInAnomalyExplorerAction';

export function isSwimLaneEmbeddableContext(
  arg: unknown
): arg is OpenInAnomalyExplorerSwimLaneActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, ANOMALY_SWIMLANE_EMBEDDABLE_TYPE)
  );
}

export function isAnomalyChartsEmbeddableContext(
  arg: unknown
): arg is OpenInAnomalyExplorerAnomalyChartsActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE)
  );
}

export const isApiCompatible = (api: unknown | null): api is OpenInAnomalyExplorerBaseActionApi =>
  Boolean(apiHasType(api));

export function createOpenInExplorerAction(getStartServices: MlCoreSetup['getStartServices']) {
  return createAction<EmbeddableApiContext>({
    id: 'open-in-anomaly-explorer',
    type: OPEN_IN_ANOMALY_EXPLORER_ACTION,
    getIconType(): string {
      return 'visTable';
    },
    getDisplayName() {
      return i18n.translate('xpack.ml.actions.openInAnomalyExplorerTitle', {
        defaultMessage: 'Open in Anomaly Explorer',
      });
    },
    async getHref(context): Promise<string | undefined> {
      const [, pluginsStart] = await getStartServices();
      const locator = pluginsStart.share.url.locators.get(ML_APP_LOCATOR)!;

      if (isSwimLaneEmbeddableContext(context)) {
        const { data, embeddable } = context;

        const { localTimeRange, viewBy, jobIds, perPage, fromPage } = embeddable;

        return locator.getUrl({
          page: 'explorer',
          pageState: {
            jobIds,
            timeRange: localTimeRange?.getValue(),
            mlExplorerSwimlane: {
              viewByFromPage: fromPage,
              viewByPerPage: perPage,
              viewByFieldName: viewBy,
              ...(data
                ? {
                    selectedType: data.type,
                    selectedTimes: data.times,
                    selectedLanes: data.lanes,
                  }
                : {}),
            },
          },
        });
      } else if (isAnomalyChartsEmbeddableContext(context)) {
        const { embeddable } = context;
        const { jobIds, localTimeRange, entityFields } = embeddable;

        let mlExplorerFilter: ExplorerAppState['mlExplorerFilter'] | undefined;
        if (
          Array.isArray(entityFields) &&
          entityFields.length === 1 &&
          entityFields[0].operation === ML_ENTITY_FIELD_OPERATIONS.ADD
        ) {
          const { fieldName, fieldValue } = entityFields[0];
          if (fieldName !== undefined && fieldValue !== undefined) {
            const influencersFilterQuery = {
              bool: {
                should: [
                  {
                    match_phrase: {
                      [fieldName]: String(fieldValue),
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            };
            const filteredFields = [fieldName, fieldValue];
            mlExplorerFilter = {
              influencersFilterQuery,
              filterActive: true,
              queryString: `${fieldName}:"${fieldValue}"`,
              ...(Array.isArray(filteredFields) ? { filteredFields } : {}),
            };
          }
        }
        return locator.getUrl({
          page: 'explorer',
          pageState: {
            jobIds,
            timeRange: localTimeRange?.getValue(),
            // @ts-ignore QueryDslQueryContainer is not compatible with SerializableRecord
            ...(mlExplorerFilter ? ({ mlExplorerFilter } as SerializableRecord) : {}),
            query: {},
          },
        });
      }
    },
    async execute(context) {
      if (!context.embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }
      const [{ application }] = await getStartServices();
      const anomalyExplorerUrl = await this.getHref!(context);
      if (anomalyExplorerUrl) {
        await application.navigateToUrl(anomalyExplorerUrl!);
      }
    },
    async isCompatible({ embeddable }: EmbeddableApiContext) {
      if (!isApiCompatible(embeddable)) return false;
      return (
        apiIsOfType(embeddable, ANOMALY_SWIMLANE_EMBEDDABLE_TYPE) ||
        apiIsOfType(embeddable, ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE)
      );
    },
  });
}
