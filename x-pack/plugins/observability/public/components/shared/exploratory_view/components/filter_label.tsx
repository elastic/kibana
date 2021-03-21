/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { esFilters, Filter } from '../../../../../../../../src/plugins/data/public';
import { useIndexPatternContext } from '../../../../hooks/use_default_index_pattern';
import { injectI18n } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useSeriesFilters } from '../hooks/use_series_filters';

interface Props {
  field: string;
  label: string;
  value: string;
  seriesId: string;
  negate: boolean;
  removeFilter: (field: string, value: string, notVal: boolean) => void;
}
export const FilterLabel = ({ label, seriesId, field, value, negate, removeFilter }: Props) => {
  const FilterItem = injectI18n(esFilters.FilterItem);

  const { indexPattern } = useIndexPatternContext();

  const indexField = indexPattern.fields.find((fd) => fd.name === field)!;

  const filter = esFilters.buildPhraseFilter(indexField, value, indexPattern);

  filter.meta.value = value;
  filter.meta.key = label;
  filter.meta.alias = null;
  filter.meta.negate = negate;
  filter.meta.disabled = false;
  filter.meta.type = 'phrase';

  const { invertFilter } = useSeriesFilters({ seriesId });

  const {
    services: { uiSettings },
  } = useKibana();

  return (
    <FilterItem
      indexPatterns={[indexPattern]}
      id="browser"
      filter={filter}
      onRemove={() => {
        removeFilter(field, value, false);
      }}
      onUpdate={(filterN: Filter) => {
        if (filterN.meta.negate !== negate) {
          invertFilter({ field, value, negate });
        }
      }}
      uiSettings={uiSettings!}
      hiddenPanelOptions={['pinFilter', 'editFilter', 'disableFilter']}
    />
  );
};
