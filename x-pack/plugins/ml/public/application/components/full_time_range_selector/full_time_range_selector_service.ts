/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type { Query } from 'src/plugins/data/public';
import { IndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import type { RuntimeMappings } from '../../../../common/types/fields';
import { isPopulatedObject } from '../../../../common/util/object_utils';
import type { GetTimeFieldRangeResponse } from '../../services/ml_api_service';
import { ml } from '../../services/ml_api_service';
import { getTimefilter, getToastNotifications } from '../../util/dependency_cache';

export interface TimeRange {
  from: number;
  to: number;
}

export async function setFullTimeRange(
  indexPattern: IndexPattern,
  query: Query
): Promise<GetTimeFieldRangeResponse> {
  try {
    const timefilter = getTimefilter();
    const runtimeMappings = indexPattern.getComputedFields().runtimeFields as RuntimeMappings;
    const resp = await ml.getTimeFieldRange({
      index: indexPattern.title,
      timeFieldName: indexPattern.timeFieldName,
      query,
      ...(isPopulatedObject(runtimeMappings) ? { runtimeMappings } : {}),
    });
    timefilter.setTime({
      from: moment(resp.start.epoch).toISOString(),
      to: moment(resp.end.epoch).toISOString(),
    });
    return resp;
  } catch (resp) {
    const toastNotifications = getToastNotifications();
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.fullTimeRangeSelector.errorSettingTimeRangeNotification', {
        defaultMessage: 'An error occurred setting the time range.',
      })
    );
    return resp;
  }
}

export function getTimeFilterRange(): TimeRange {
  const timefilter = getTimefilter();
  const fromMoment = dateMath.parse(timefilter.getTime().from);
  const toMoment = dateMath.parse(timefilter.getTime().to);
  const from = fromMoment !== undefined ? fromMoment.valueOf() : 0;
  const to = toMoment !== undefined ? toMoment.valueOf() : 0;

  return {
    to,
    from,
  };
}
