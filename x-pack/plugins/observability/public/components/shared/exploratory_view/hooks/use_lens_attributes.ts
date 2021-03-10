/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypedLensByValueInput } from '../../../../../../lens/public';
import { useIndexPatternContext } from '../../../../hooks/use_default_index_pattern';
import { LensAttributes } from '../configurations/lens_attributes';
import { useUrlStorage } from './use_url_strorage';
import { DataViewType, SeriesUrl } from '../types';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getDefaultConfigs } from '../configurations/default_configs';

interface Props {
  seriesId: string;
}

export const useLensAttributes = ({
  seriesId,
}: Props): TypedLensByValueInput['attributes'] | null => {
  const { dataViewType } = useParams<{ dataViewType: DataViewType }>();

  const dataViewConfig = getDefaultConfigs({ dataViewType });

  const { indexPattern: defaultIndexPattern } = useIndexPatternContext(dataViewConfig.indexPattern);

  const storage = useUrlStorage();

  const series = storage.get<SeriesUrl>(seriesId);

  const { filters = [] } = series ?? {};

  return useMemo(() => {
    if (!defaultIndexPattern) {
      return null;
    }

    const lensAttributes = new LensAttributes(
      defaultIndexPattern,
      dataViewConfig,
      series?.seriesType!,
      filters
    );

    if (series?.breakdown) {
      lensAttributes.addBreakdown(series.breakdown);
    }

    return lensAttributes.getJSON();
  }, [defaultIndexPattern, series?.breakdown, series?.seriesType, filters]);
};
