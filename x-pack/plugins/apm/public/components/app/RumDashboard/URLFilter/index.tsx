/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { EuiSpacer, EuiBadge } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { Projection } from '../../../../../common/projections';
import { useLocalUIFilters } from '../../../../hooks/useLocalUIFilters';
import { URLSearch } from './URLSearch';
import { LocalUIFilters } from '../../../shared/LocalUIFilters';
import { UrlList } from './UrlList';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';

const removeSearchTermLabel = i18n.translate(
  'xpack.apm.uiFilter.url.removeSearchTerm',
  { defaultMessage: 'Clear url query' }
);

export function URLFilter() {
  const history = useHistory();

  const {
    urlParams: { searchTerm },
  } = useUrlParams();

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionUrl'],
      projection: Projection.rumOverview,
    };

    return config;
  }, []);

  const { filters, setFilterValue } = useLocalUIFilters({
    ...localUIFiltersConfig,
  });

  const updateSearchTerm = useCallback(
    (searchTermN?: string) => {
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          searchTerm: searchTermN,
        }),
      };
      history.push(newLocation);
    },
    [history]
  );

  const { name, value: filterValue } = filters[0];

  return (
    <span data-cy="csmUrlFilter">
      <EuiSpacer size="s" />
      <URLSearch
        onChange={(value) => {
          setFilterValue('transactionUrl', value);
        }}
      />
      <EuiSpacer size="s" />
      {searchTerm && (
        <>
          <EuiBadge
            onClick={() => {
              updateSearchTerm();
            }}
            onClickAriaLabel={removeSearchTermLabel}
            iconOnClick={() => {
              updateSearchTerm();
            }}
            iconOnClickAriaLabel={removeSearchTermLabel}
            iconType="cross"
            iconSide="right"
          >
            *{searchTerm}*
          </EuiBadge>
          <EuiSpacer size="s" />
        </>
      )}
      {filterValue.length > 0 && (
        <UrlList
          onRemove={(val) => {
            setFilterValue(
              name,
              filterValue.filter((v) => val !== v)
            );
          }}
          value={filterValue}
        />
      )}
      <EuiSpacer size="m" />
    </span>
  );
}
