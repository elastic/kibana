/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { MAX_TAGS_FILTER_LENGTH } from '../../../common/constants';
import * as i18n from './translations';
import { FilterPopover } from '../filter_popover';

interface CaseFilter {
  selected: Set<EuiSelectableOption>;
  options: Set<EuiSelectableOption>;
  isActive: boolean;
}

// order matters
const FILTER_TYPES = ['tags'] as const;
type CaseFilters = { [K in typeof FILTER_TYPES[number]]: CaseFilter };

const getDefaultFilterValues = (initial: {
  [K in typeof FILTER_TYPES[number]]: string | string[];
}) => {
  return FILTER_TYPES.reduce((acc, filterType) => {
    acc[filterType] = {
      selected: new Set<EuiSelectableOption>(),
      options: new Set<EuiSelectableOption>(initial[filterType] ?? []), // not initialized but we need to convert x-pack/plugins/cases/public/containers/use_get_cases.tsx#DEFAULT_FILTER_OPTIONS to EuiSelectableOption that have {label: }
      isActive: true,
    };

    return acc;
  }, {} as CaseFilters);
};

export const useFilters = ({
  initial,
}: {
  initial: {
    [K in typeof FILTER_TYPES[number]]: EuiSelectableOption[];
  };
}) => {
  const [filters, setFilters] = useState<CaseFilters>(getDefaultFilterValues(initial));
  const onFilterUpdate = useCallback(
    (name: keyof CaseFilters, newSelected: Set<EuiSelectableOption>) => {
      setFilters((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          selected: newSelected,
        },
      }));
    },
    []
  );

  const filterComponents = {
    tags: () => {
      console.log({ entries: Array.from(filters.tags.options.entries()) });
      return (
        <FilterPopover
          buttonLabel={i18n.TAGS}
          onSelectedOptionsChanged={(value: EuiSelectableOption[]) =>
            onFilterUpdate('tags', new Set(value))
          }
          selectedOptions={Array.from(filters.tags.selected.values())}
          options={Array.from(filters.tags.options.values())}
          optionsEmptyLabel={i18n.NO_TAGS_AVAILABLE}
          limit={MAX_TAGS_FILTER_LENGTH}
          limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_TAGS_FILTER_LENGTH, 'tags')}
        />
      );
    },
  };

  // const selectedOptions =

  return { filterComponents, onFilterUpdate };
};
