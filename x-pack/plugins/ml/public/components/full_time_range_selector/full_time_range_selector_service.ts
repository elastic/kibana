/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { i18n } from '@kbn/i18n';
import { Query } from 'ui/embeddable';
import { IndexPattern } from 'ui/index_patterns';
import { toastNotifications } from 'ui/notify';
import { timefilter } from 'ui/timefilter';
import { ml } from '../../services/ml_api_service';
import { TimeRange } from './index';

export function setFullTimeRange(indexPattern: IndexPattern, query: Query): Promise<TimeRange> {
  return ml
    .getTimeFieldRange({
      index: indexPattern.title,
      timeFieldName: indexPattern.timeFieldName,
      query,
    })
    .then(resp => {
      const start = resp.start.epoch;
      const end = resp.end.epoch;

      const duration = {
        from: moment(start).toISOString(),
        to: moment(end).toISOString(),
      };
      timefilter.setTime(duration);
      return {
        epoch: {
          start,
          end,
        },
        ...duration,
      };
    })
    .catch(resp => {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.fullTimeRangeSelector.errorSettingTimeRangeNotification', {
          defaultMessage: 'An error occurred setting the time range.',
        })
      );
      return { epoch: { start: 0, end: 0 }, from: '', to: '' };
    });
}
