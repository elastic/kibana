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

export function setFullTimeRange(indexPattern: IndexPattern, query: Query) {
  return ml
    .getTimeFieldRange({
      index: indexPattern.title,
      timeFieldName: indexPattern.timeFieldName,
      query,
    })
    .then(resp => {
      timefilter.setTime({
        from: moment(resp.start.epoch).toISOString(),
        to: moment(resp.end.epoch).toISOString(),
      });
    })
    .catch(resp => {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.fullTimeRangeSelector.errorSettingTimeRangeNotification', {
          defaultMessage: 'An error occurred setting the time range.',
        })
      );
    });
}
