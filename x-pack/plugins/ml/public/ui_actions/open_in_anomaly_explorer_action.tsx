/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ActionContextMapping, createAction } from '../../../../../src/plugins/ui_actions/public';
import {
  AnomalySwimlaneEmbeddable,
  EditSwimlanePanelContext,
} from '../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';
import { ViewMode } from '../../../../../src/plugins/embeddable/public';
import { MlCoreSetup } from '../plugin';
import { ML_APP_URL_GENERATOR } from '../url_generator';

export const OPEN_IN_ANOMALY_EXPLORER_ACTION = 'openInAnomalyExplorerAction';

export function createOpenInExplorerAction(getStartServices: MlCoreSetup['getStartServices']) {
  return createAction<typeof OPEN_IN_ANOMALY_EXPLORER_ACTION>({
    id: 'open-in-anomaly-explorer',
    type: OPEN_IN_ANOMALY_EXPLORER_ACTION,
    getIconType(context: ActionContextMapping[typeof OPEN_IN_ANOMALY_EXPLORER_ACTION]): string {
      return 'tableOfContents';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.openInAnomalyExplorerTitle', {
        defaultMessage: 'Open in Anomaly Explorer',
      }),
    async getHref({ embeddable }: EditSwimlanePanelContext): Promise<string> {
      const [, pluginsStart] = await getStartServices();
      const urlGenerator = pluginsStart.share.urlGenerators.getUrlGenerator(ML_APP_URL_GENERATOR);
      const { perPage, jobIds, query, filters, timeRange } = embeddable.getInput();
      return urlGenerator.createUrl({
        page: 'explorer',
        jobIds,
        query,
        filters,
        timeRange,
        viewByPerPage: perPage,
      });
    },
    async execute({ embeddable }: EditSwimlanePanelContext) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }
      const [{ application }] = await getStartServices();
      const anomalyExplorerUrl = await this.getHref!({ embeddable });
      await application.navigateToUrl(anomalyExplorerUrl!);
    },
    isCompatible: async ({ embeddable }: EditSwimlanePanelContext) => {
      return (
        embeddable instanceof AnomalySwimlaneEmbeddable &&
        embeddable.getInput().viewMode === ViewMode.VIEW
      );
    },
  });
}
