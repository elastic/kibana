/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import { apiHasParentApi, apiPublishesTimeRange } from '@kbn/presentation-publishing';
import type { ChangePointEmbeddableApi } from '../embeddables/change_point_chart/types';
import type { AiopsPluginStartDeps } from '../types';
import type { ChangePointChartActionContext } from './change_point_action_context';
import { isChangePointChartEmbeddableContext } from './change_point_action_context';

export const OPEN_CHANGE_POINT_IN_ML_APP_ACTION = 'openChangePointInMlAppAction';

export const getEmbeddableTimeRange = (
  embeddable: ChangePointEmbeddableApi
): TimeRange | undefined => {
  let timeRange = embeddable.timeRange$?.getValue();

  if (!timeRange && apiHasParentApi(embeddable) && apiPublishesTimeRange(embeddable.parentApi)) {
    timeRange = embeddable.parentApi.timeRange$.getValue();
  }

  return timeRange;
};

export function createOpenChangePointInMlAppAction(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
): UiActionsActionDefinition<ChangePointChartActionContext> {
  return {
    id: 'open-change-point-in-ml-app',
    type: OPEN_CHANGE_POINT_IN_ML_APP_ACTION,
    getIconType(context): string {
      return 'link';
    },
    getDisplayName: () =>
      i18n.translate('xpack.aiops.actions.openChangePointInMlAppName', {
        defaultMessage: 'Open in AIOps Labs',
      }),
    async getHref(context): Promise<string | undefined> {
      if (!isChangePointChartEmbeddableContext(context)) {
        throw new IncompatibleActionError();
      }

      const locator = pluginStart.share.url.locators.get('ML_APP_LOCATOR')!;

      const { metricField, fn, splitField, dataViewId } = context.embeddable;

      return locator.getUrl({
        page: 'aiops/change_point_detection',
        pageState: {
          index: dataViewId.getValue(),
          timeRange: getEmbeddableTimeRange(context.embeddable),
          fieldConfigs: [
            {
              fn: fn.getValue(),
              metricField: metricField.getValue(),
              ...(splitField.getValue() ? { splitField: splitField.getValue() } : {}),
            },
          ],
        },
      });
    },
    async execute(context) {
      if (!isChangePointChartEmbeddableContext(context)) {
        throw new IncompatibleActionError();
      }
      const aiopsChangePointUrl = await this.getHref!(context);
      if (aiopsChangePointUrl) {
        await coreStart.application.navigateToUrl(aiopsChangePointUrl!);
      }
    },
    async isCompatible(context) {
      return isChangePointChartEmbeddableContext(context);
    },
  };
}
