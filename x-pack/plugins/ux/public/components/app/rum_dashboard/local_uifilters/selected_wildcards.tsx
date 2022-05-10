/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import {
  FilterValueLabel,
  fromQuery,
  toQuery,
} from '@kbn/observability-plugin/public';
import { IndexPattern } from '@kbn/data-views-plugin/common';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { TRANSACTION_URL } from '../../../../../common/elasticsearch_fieldnames';

interface Props {
  indexPattern: IndexPattern;
}
export function SelectedWildcards({ indexPattern }: Props) {
  const history = useHistory();

  const {
    urlParams: { searchTerm },
  } = useLegacyUrlParams();

  const updateSearchTerm = useCallback(
    (searchTermN: string) => {
      const newQuery = {
        ...toQuery(history.location.search),
        searchTerm: searchTermN || undefined,
      };
      if (!searchTermN) {
        delete newQuery.searchTerm;
      }
      const newLocation = {
        ...history.location,
        search: fromQuery(newQuery),
      };
      history.push(newLocation);
    },
    [history]
  );

  return searchTerm ? (
    <FilterValueLabel
      dataView={indexPattern}
      removeFilter={() => {
        updateSearchTerm('');
      }}
      invertFilter={({ negate }) => {}}
      field={TRANSACTION_URL}
      value={searchTerm}
      negate={false}
      label={'URL wildcard'}
    />
  ) : null;
}
