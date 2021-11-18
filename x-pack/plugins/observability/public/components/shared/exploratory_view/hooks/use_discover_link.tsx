/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useKibana } from '../../../../utils/kibana_react';
import { SeriesConfig, SeriesUrl } from '../types';
import { useAppIndexPatternContext } from './use_app_index_pattern';
import { buildExistsFilter, buildPhraseFilter, buildPhrasesFilter } from '../configurations/utils';
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

  const urlGenerator = kServices.discover?.urlGenerator;
  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const indexPattern = indexPatterns?.[series.dataType];

    const definitions = series.reportDefinitions ?? {};
    const filters = [...(seriesConfig?.baseFilters ?? [])];

    const definitionFilters = getFiltersFromDefs(definitions);

    definitionFilters.forEach(({ field, values = [] }) => {
      if (values.length > 1) {
        filters.push(buildPhrasesFilter(field, values, indexPattern)[0]);
      } else {
        filters.push(buildPhraseFilter(field, values[0], indexPattern)[0]);
      }
    });

    const selectedMetricField = series.selectedMetricField;

    if (
      selectedMetricField &&
      selectedMetricField !== RECORDS_FIELD &&
      selectedMetricField !== RECORDS_PERCENTAGE_FIELD
    ) {
      filters.push(buildExistsFilter(selectedMetricField, indexPattern)[0]);
    }

    const getDiscoverUrl = async () => {
      if (!urlGenerator?.createUrl) return;

      const newUrl = await urlGenerator.createUrl({
        filters,
        indexPatternId: indexPattern?.id,
      });
      setDiscoverUrl(newUrl);
    };
    getDiscoverUrl();
  }, [
    indexPatterns,
    series.dataType,
    series.reportDefinitions,
    series.selectedMetricField,
    seriesConfig?.baseFilters,
    urlGenerator,
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
