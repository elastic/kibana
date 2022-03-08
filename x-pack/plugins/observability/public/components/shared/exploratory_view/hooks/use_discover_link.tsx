/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { Filter } from '@kbn/es-query';
import { useKibana } from '../../../../utils/kibana_react';
import { SeriesConfig, SeriesUrl } from '../types';
import { useAppIndexPatternContext } from './use_app_index_pattern';
import { buildExistsFilter, urlFilterToPersistedFilter } from '../configurations/utils';
import { getFiltersFromDefs } from './use_lens_attributes';
import { RECORDS_FIELD, RECORDS_PERCENTAGE_FIELD } from '../configurations/constants';

interface UseDiscoverLink {
  seriesConfig?: SeriesConfig;
  series: SeriesUrl;
}

export const useDiscoverLink = ({ series, seriesConfig }: UseDiscoverLink) => {
  const kServices = useKibana().services;
  const {
    application: { navigateToUrl },
  } = kServices;

  const { indexPatterns } = useAppIndexPatternContext();

  const locator = kServices.discover?.locator;
  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const indexPattern = indexPatterns?.[series.dataType];

    if (indexPattern) {
      const definitions = series.reportDefinitions ?? {};

      const urlFilters = (series.filters ?? []).concat(getFiltersFromDefs(definitions));

      const filters = urlFilterToPersistedFilter({
        indexPattern,
        urlFilters,
        initFilters: seriesConfig?.baseFilters,
      }) as Filter[];

      const selectedMetricField = series.selectedMetricField;

      if (
        selectedMetricField &&
        selectedMetricField !== RECORDS_FIELD &&
        selectedMetricField !== RECORDS_PERCENTAGE_FIELD
      ) {
        filters.push(buildExistsFilter(selectedMetricField, indexPattern)[0]);
      }

      const getDiscoverUrl = async () => {
        if (!locator) return;

        const newUrl = await locator.getUrl({
          filters,
          indexPatternId: indexPattern?.id,
        });
        setDiscoverUrl(newUrl);
      };
      getDiscoverUrl();
    }
  }, [
    indexPatterns,
    series.dataType,
    series.filters,
    series.reportDefinitions,
    series.selectedMetricField,
    seriesConfig?.baseFilters,
    locator,
  ]);

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (discoverUrl) {
        event.preventDefault();

        return navigateToUrl(discoverUrl);
      }
    },
    [discoverUrl, navigateToUrl]
  );

  return {
    href: discoverUrl,
    onClick,
  };
};
