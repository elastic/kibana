/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { EuiSpacer, EuiBadge } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';
import { URLSearch } from './URLSearch';
import { UrlList } from './UrlList';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { removeUndefinedProps } from '../../../../context/UrlParamsContext/helpers';
import { LocalUIFilterName } from '../../../../../common/ui_filter';

const removeSearchTermLabel = i18n.translate(
  'xpack.apm.uiFilter.url.removeSearchTerm',
  { defaultMessage: 'Clear url query' }
);

export function URLFilter() {
  const history = useHistory();

  const {
    urlParams: { searchTerm },
  } = useUrlParams();

  const setFilterValue = (name: LocalUIFilterName, value: string[]) => {
    const search = omit(toQuery(history.location.search), name);

    history.push({
      ...history.location,
      search: fromQuery(
        removeUndefinedProps({
          ...search,
          [name]: value.length ? value.join(',') : undefined,
        })
      ),
    });
  };

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

  const name = 'transactionUrl';

  const { uiFilters } = useUrlParams();
  const { transactionUrl } = uiFilters;

  const filterValue = transactionUrl ?? [];

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
