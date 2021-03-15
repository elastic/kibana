/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypedLensByValueInput } from '../../../../../../lens/public';
import { LensAttributes } from '../configurations/lens_attributes';
import { useUrlStorage } from './use_url_strorage';
import { useMemo } from 'react';
import { getDefaultConfigs } from '../configurations/default_configs';
import {
  BREAK_DOWN,
  FILTERS,
  METRIC_TYPE,
  REPORT_TYPE,
  SERIES_TYPE,
} from '../configurations/constants';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';

interface Props {
  seriesId: string;
  indexPattern?: IIndexPattern | null;
}

export const useLensAttributes = ({
  seriesId,
  indexPattern,
}: Props): TypedLensByValueInput['attributes'] | null => {
  const { series } = useUrlStorage(seriesId);

  const dataViewConfig = getDefaultConfigs({
    reportType: series[REPORT_TYPE],
    serviceName: series.serviceName,
    seriesId,
  });

  const {
    [FILTERS]: filters = [],
    [BREAK_DOWN]: breakdown,
    [SERIES_TYPE]: seriesType,
    [METRIC_TYPE]: metricType,
  } = series ?? {};

  return useMemo(() => {
    if (!indexPattern) {
      return null;
    }

    const lensAttributes = new LensAttributes(
      indexPattern,
      dataViewConfig,
      seriesType!,
      filters,
      metricType
    );

    if (breakdown) {
      lensAttributes.addBreakdown(breakdown);
    }

    return lensAttributes.getJSON();
  }, [indexPattern, breakdown, seriesType, filters, metricType]);
};
