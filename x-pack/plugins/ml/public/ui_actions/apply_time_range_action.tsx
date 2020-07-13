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

export const APPLY_TIME_RANGE_SELECTION_ACTION = 'applyTimeRangeSelectionAction';

export function createApplyTimeRangeSelectionAction(
  getStartServices: MlCoreSetup['getStartServices']
) {
  return createAction<typeof APPLY_TIME_RANGE_SELECTION_ACTION>({
    id: 'apply-time-range-selection',
    type: APPLY_TIME_RANGE_SELECTION_ACTION,
    getIconType(context: ActionContextMapping[typeof APPLY_TIME_RANGE_SELECTION_ACTION]): string {
      return 'timeline';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.applyTimeRangeSelectionTitle', {
        defaultMessage: 'Apply time range selection',
      }),
    async execute({ embeddable, data }: SwimLaneDrilldownContext) {
      if (!data) {
        throw new Error('No swim lane selection data provided');
      }
      const [, pluginStart] = await getStartServices();
      const timefilter = pluginStart.data.query.timefilter.timefilter;
      const { interval } = embeddable.getOutput();

      if (!interval) {
        throw new Error('Interval is required to set a time range');
      }

      let [from, to] = data.times;
      from = from * 1000;
      // extend bounds with the interval
      to = to * 1000 + interval * 1000;

      timefilter.setTime({
        from: moment(from),
        to: moment(to),
        mode: 'absolute',
      });
    },
    async isCompatible({ embeddable, data }: SwimLaneDrilldownContext) {
      return embeddable instanceof AnomalySwimlaneEmbeddable && data !== undefined;
    },
  });
}
