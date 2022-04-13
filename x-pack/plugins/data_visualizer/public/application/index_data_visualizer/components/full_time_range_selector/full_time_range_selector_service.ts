/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { TimefilterContract } from 'src/plugins/data/public';
import dateMath from '@kbn/datemath';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type { ToastsStart } from 'kibana/public';
import { DataView } from '../../../../../../../../src/plugins/data_views/public';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import { getTimeFieldRange } from '../../services/time_field_range';
import type { GetTimeFieldRangeResponse } from '../../../../../common/types/time_field_request';
import { addExcludeFrozenToQuery } from '../../utils/query_utils';

export interface TimeRange {
  from: number;
  to: number;
}

export async function setFullTimeRange(
  timefilter: TimefilterContract,
  dataView: DataView,
  query?: QueryDslQueryContainer,
  excludeFrozenData?: boolean,
  toasts?: ToastsStart
): Promise<GetTimeFieldRangeResponse> {
  const runtimeMappings = dataView.getRuntimeMappings();
  const resp = await getTimeFieldRange({
    index: dataView.title,
    timeFieldName: dataView.timeFieldName,
    query: excludeFrozenData ? addExcludeFrozenToQuery(query) : query,
    ...(isPopulatedObject(runtimeMappings) ? { runtimeMappings } : {}),
  });

  if (resp.start.epoch && resp.end.epoch) {
    timefilter.setTime({
      from: moment(resp.start.epoch).toISOString(),
      to: moment(resp.end.epoch).toISOString(),
    });
  } else {
    toasts?.addWarning({
      title: i18n.translate('xpack.dataVisualizer.index.fullTimeRangeSelector.noResults', {
        defaultMessage: 'No results match your search criteria',
      }),
    });
  }
  return resp;
}

export function getTimeFilterRange(timefilter: TimefilterContract): TimeRange {
  const fromMoment = dateMath.parse(timefilter.getTime().from);
  const toMoment = dateMath.parse(timefilter.getTime().to);
  const from = fromMoment !== undefined ? fromMoment.valueOf() : 0;
  const to = toMoment !== undefined ? toMoment.valueOf() : 0;

  return {
    to,
    from,
  };
}
