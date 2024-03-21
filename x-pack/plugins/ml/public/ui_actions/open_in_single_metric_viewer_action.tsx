/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type {
  EmbeddableApiContext,
  HasParentApi,
  HasType,
  PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { apiHasType, apiIsOfType } from '@kbn/presentation-publishing';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { ML_APP_LOCATOR, ML_PAGES } from '../../common/constants/locator';
import type { AnomalySingleMetricViewerEmbeddableType } from '../embeddables';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '../embeddables';
import type { MlCoreSetup } from '../plugin';
import type { JobId } from '../shared';

export interface SingleMetricViewerFieldSelectionApi {
  input: {
    jobIds: JobId[];
    query: any;
    selectedEntities: MlEntityField | undefined;
  };
}

export interface OpenInSingleMetricViewerActionContext extends EmbeddableApiContext {
  embeddable: OpenInSingleMetricViewerFromSingleMetricViewerActionApi;
  /**
   * Optional fields selected using anomaly charts
   */
  data?: MlEntityField[];
}

export type OpenInSingleMetricViewerBaseActionApi = Partial<
  HasParentApi<PublishesUnifiedSearch> & PublishesUnifiedSearch & { jobIds: JobId[] }
>;

export type OpenInSingleMetricViewerFromSingleMetricViewerActionApi =
  HasType<AnomalySingleMetricViewerEmbeddableType> &
    OpenInSingleMetricViewerBaseActionApi &
    SingleMetricViewerFieldSelectionApi;

export const OPEN_IN_SINGLE_METRIC_VIEWER_ACTION = 'openInSingleMetricViewerAction';

export function isSingleMetricViewerEmbeddableContext(
  arg: unknown
): arg is OpenInSingleMetricViewerActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE)
  );
}

export const isApiCompatible = (
  api: unknown | null
): api is OpenInSingleMetricViewerBaseActionApi => Boolean(apiHasType(api));

const getTimeRange = (embeddable: OpenInSingleMetricViewerBaseActionApi): TimeRange | undefined => {
  return embeddable.timeRange$?.getValue() ?? embeddable.parentApi?.timeRange$?.getValue();
};

export function createOpenInSingleMetricViewerAction(
  getStartServices: MlCoreSetup['getStartServices']
) {
  return createAction<EmbeddableApiContext>({
    id: 'open-in-single-metric-viewer',
    type: OPEN_IN_SINGLE_METRIC_VIEWER_ACTION,
    getIconType(): string {
      return 'visTable';
    },
    getDisplayName() {
      return i18n.translate('xpack.ml.actions.openInSingleMetricViewerTitle', {
        defaultMessage: 'Open in Single Metric Viewer',
      });
    },
    async getHref(context): Promise<string | undefined> {
      const [, pluginsStart] = await getStartServices();
      const locator = pluginsStart.share.url.locators.get(ML_APP_LOCATOR)!;

      if (isSingleMetricViewerEmbeddableContext(context)) {
        const { embeddable } = context;
        const {
          input: { jobIds, query, selectedEntities },
        } = embeddable;

        return locator.getUrl(
          {
            page: ML_PAGES.SINGLE_METRIC_VIEWER,
            // @ts-ignore entities is not compatible with SerializableRecord
            pageState: {
              timeRange: getTimeRange(embeddable),
              refreshInterval: {
                display: 'Off',
                pause: true,
                value: 0,
              },
              jobIds,
              query,
              entities: selectedEntities,
            },
          },
          { absolute: true }
        );
      }
    },
    async execute(context) {
      if (!context.embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }
      const [{ application }] = await getStartServices();
      const singleMetricViewerUrl = await this.getHref!(context);
      if (singleMetricViewerUrl) {
        await application.navigateToUrl(singleMetricViewerUrl!);
      }
    },
    async isCompatible(context: EmbeddableApiContext) {
      return isSingleMetricViewerEmbeddableContext(context);
    },
  });
}
