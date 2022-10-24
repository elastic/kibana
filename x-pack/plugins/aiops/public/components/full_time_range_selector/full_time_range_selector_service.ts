/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO Consolidate with duplicate service in
// `x-pack/plugins/data_visualizer/public/application/index_data_visualizer/components/full_time_range_selector/full_time_range_selector_service.ts`

import moment from 'moment';
import { TimefilterContract } from '@kbn/data-plugin/public';
import dateMath from '@kbn/datemath';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { getTimeFieldRange } from '../../application/services/time_field_range';
import { addExcludeFrozenToQuery } from '../../application/utils/query_utils';

export interface GetTimeFieldRangeResponse {
  success: boolean;
  start: { epoch: number; string: string };
  end: { epoch: number; string: string };
}

export interface TimeRange {
  from: number;
  to: number;
}

export async function setFullTimeRange(
  timefilter: TimefilterContract,
  dataView: DataView,
  toasts: ToastsStart,
  http: HttpStart,
  query?: QueryDslQueryContainer,
  excludeFrozenData?: boolean
): Promise<GetTimeFieldRangeResponse> {
  const runtimeMappings = dataView.getRuntimeMappings();
  const resp = await getTimeFieldRange({
    index: dataView.getIndexPattern(),
    timeFieldName: dataView.timeFieldName,
    query: excludeFrozenData ? addExcludeFrozenToQuery(query) : query,
    ...(isPopulatedObject(runtimeMappings) ? { runtimeMappings } : {}),
    http,
  });

  if (resp.start.epoch && resp.end.epoch) {
    timefilter.setTime({
      from: moment(resp.start.epoch).toISOString(),
      to: moment(resp.end.epoch).toISOString(),
    });
  } else {
    toasts.addWarning({
      title: i18n.translate('xpack.aiops.index.fullTimeRangeSelector.noResults', {
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
