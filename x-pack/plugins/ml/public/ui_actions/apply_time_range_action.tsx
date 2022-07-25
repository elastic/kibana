/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { MlCoreSetup } from '../plugin';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, SwimLaneDrilldownContext } from '../embeddables';

export const APPLY_TIME_RANGE_SELECTION_ACTION = 'applyTimeRangeSelectionAction';

export function createApplyTimeRangeSelectionAction(
  getStartServices: MlCoreSetup['getStartServices']
) {
  return createAction<SwimLaneDrilldownContext>({
    id: 'apply-time-range-selection',
    type: APPLY_TIME_RANGE_SELECTION_ACTION,
    getIconType(context): string {
      return 'timeline';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.applyTimeRangeSelectionTitle', {
        defaultMessage: 'Apply time range selection',
      }),
    async execute({ embeddable, data }) {
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
      to = to * 1000;

      timefilter.setTime({
        from: moment(from),
        to: moment(to),
        mode: 'absolute',
      });
    },
    async isCompatible({ embeddable, data }) {
      return embeddable.type === ANOMALY_SWIMLANE_EMBEDDABLE_TYPE && data !== undefined;
    },
  });
}
