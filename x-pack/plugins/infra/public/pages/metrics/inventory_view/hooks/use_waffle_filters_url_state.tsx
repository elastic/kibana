/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { UrlStateContainer } from '../../../../utils/url_state';
import { useWaffleFilters } from './use_waffle_filters';

interface WaffleFiltersState {
  expression: string;
  kind: 'kuery';
}

export const WithWaffleFiltersUrlState = () => {
  const { filterQuery, applyFilterQuery } = useWaffleFilters();

  const urlState = useMemo(() => filterQuery, [filterQuery]);

  const handleChange = (newUrlState: WaffleFiltersState | undefined) => {
    if (newUrlState?.expression) {
      applyFilterQuery({
        kind: newUrlState?.kind,
        expression: newUrlState?.expression,
      });
    }
  };

  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="waffleFilter"
      mapToUrlState={mapToUrlState}
      onChange={handleChange}
      onInitialize={handleChange}
      populateWithInitialState={true}
    />
  );
};

export const mapToUrlState = (value: any): WaffleFiltersState | undefined => {
  if (value?.expression) {
    const { expression, kind } = value;
    return { expression, kind };
  }
  return undefined;
};
