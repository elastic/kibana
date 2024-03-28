/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { type EmbeddableApiContext, apiIsOfType } from '@kbn/presentation-publishing';
import {
  type UiActionsActionDefinition,
  IncompatibleActionError,
} from '@kbn/ui-actions-plugin/public';
import { ML_APP_LOCATOR, ML_PAGES } from '../../common/constants/locator';
import type { MlEmbeddableBaseApi, SingleMetricViewerEmbeddableApi } from '../embeddables';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '../embeddables';

import type { MlCoreSetup } from '../plugin';

export interface OpenInSingleMetricViewerActionContext extends EmbeddableApiContext {
  embeddable: SingleMetricViewerEmbeddableApi;
}

export const OPEN_IN_SINGLE_METRIC_VIEWER_ACTION = 'openInSingleMetricViewerAction';

export function isSingleMetricViewerEmbeddableContext(
  arg: unknown
): arg is OpenInSingleMetricViewerActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE)
  );
}

const getTimeRange = (embeddable: MlEmbeddableBaseApi): TimeRange | undefined => {
  return embeddable.timeRange$?.getValue() ?? embeddable.parentApi?.timeRange$?.getValue();
};

export function createOpenInSingleMetricViewerAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<OpenInSingleMetricViewerActionContext> {
  return {
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
        const { jobIds, query$, selectedEntities } = embeddable;

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
              jobIds: jobIds.getValue(),
              query: query$?.getValue(),
              entities: selectedEntities?.getValue(),
            },
          },
          { absolute: true }
        );
      }
    },
    async execute(context) {
      if (!isSingleMetricViewerEmbeddableContext(context)) {
        throw new IncompatibleActionError();
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
  };
}
