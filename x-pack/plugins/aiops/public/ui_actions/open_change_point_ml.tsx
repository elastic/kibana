/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { AiopsPluginStartDeps } from '../types';
import type { EditChangePointChartsPanelContext } from '../embeddable/types';

export const OPEN_CHANGE_POINT_IN_ML_APP_ACTION = 'openChangePointInMlAppAction';

export function createOpenChangePointInMlAppAction(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
): UiActionsActionDefinition<EditChangePointChartsPanelContext> {
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
      const locator = pluginStart.share.url.locators.get('ML_APP_LOCATOR')!;

      const { timeRange, metricField, fn, splitField, dataViewId } = context.embeddable.getInput();

      return locator.getUrl({
        page: 'aiops/change_point_detection',
        pageState: {
          index: dataViewId,
          timeRange,
          fieldConfigs: [{ fn, metricField, ...(splitField ? { splitField } : {}) }],
        },
      });
    },
    async execute(context) {
      if (!context.embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }
      const aiopsChangePointUrl = await this.getHref!(context);
      if (aiopsChangePointUrl) {
        await coreStart.application.navigateToUrl(aiopsChangePointUrl!);
      }
    },
    async isCompatible({ embeddable }) {
      return embeddable.type === EMBEDDABLE_CHANGE_POINT_CHART_TYPE;
    },
  };
}
