/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ActionContextMapping, createAction } from '../../../../../src/plugins/ui_actions/public';
import { MlCoreSetup } from '../plugin';
import { ML_APP_URL_GENERATOR } from '../url_generator';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, SwimLaneDrilldownContext } from '../embeddables';

export const OPEN_IN_ANOMALY_EXPLORER_ACTION = 'openInAnomalyExplorerAction';

export function createOpenInExplorerAction(getStartServices: MlCoreSetup['getStartServices']) {
  return createAction<typeof OPEN_IN_ANOMALY_EXPLORER_ACTION>({
    id: 'open-in-anomaly-explorer',
    type: OPEN_IN_ANOMALY_EXPLORER_ACTION,
    getIconType(context: ActionContextMapping[typeof OPEN_IN_ANOMALY_EXPLORER_ACTION]): string {
      return 'visTable';
    },
    getDisplayName() {
      return i18n.translate('xpack.ml.actions.openInAnomalyExplorerTitle', {
        defaultMessage: 'Open in Anomaly Explorer',
      });
    },
    async getHref({ embeddable, data }: SwimLaneDrilldownContext): Promise<string> {
      const [, pluginsStart] = await getStartServices();
      const urlGenerator = pluginsStart.share.urlGenerators.getUrlGenerator(ML_APP_URL_GENERATOR);
      const { jobIds, timeRange, viewBy } = embeddable.getInput();
      const { perPage, fromPage } = embeddable.getOutput();

      return urlGenerator.createUrl({
        page: 'explorer',
        jobIds,
        timeRange,
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
      });
    },
    async execute({ embeddable, data }: SwimLaneDrilldownContext) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }
      const [{ application }] = await getStartServices();
      const anomalyExplorerUrl = await this.getHref!({ embeddable, data });
      await application.navigateToUrl(anomalyExplorerUrl!);
    },
    async isCompatible({ embeddable }: SwimLaneDrilldownContext) {
      return embeddable.type === ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;
    },
  });
}
