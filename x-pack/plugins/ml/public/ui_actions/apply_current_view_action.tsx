/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { ActionContextMapping, createAction } from '../../../../../src/plugins/ui_actions/public';
import {
  AnomalySwimlaneEmbeddable,
  SwimLaneDrilldownContext,
} from '../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';
import { MlCoreSetup } from '../plugin';

export const APPLY_TO_CURRENT_VIEW_ACTION = 'openInAnomalyExplorerAction';

export function createApplyToCurrentViewAction(getStartServices: MlCoreSetup['getStartServices']) {
  return createAction<typeof APPLY_TO_CURRENT_VIEW_ACTION>({
    id: 'apply-to-current-view',
    type: APPLY_TO_CURRENT_VIEW_ACTION,
    getIconType(context: ActionContextMapping[typeof APPLY_TO_CURRENT_VIEW_ACTION]): string {
      return 'filter';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.applyToCurrentViewTitle', {
        defaultMessage: 'Apply to current view',
      }),
    async execute({ embeddable, data }: SwimLaneDrilldownContext) {
      if (!data) {
        throw new Error('No swim lane selection data provided');
      }
      const [, pluginStart] = await getStartServices();
      const timefilter = pluginStart.data.query.timefilter.timefilter;

      let [from, to] = data.times;
      from = from * 1000;
      to = to * 1000;

      timefilter.setTime({
        from: moment(from),
        to: moment(from === to ? to + data.interval * 1000 : to),
        mode: 'absolute',
      });
    },
    async isCompatible({ embeddable, data }: SwimLaneDrilldownContext) {
      return embeddable instanceof AnomalySwimlaneEmbeddable && data !== undefined;
    },
  });
}
