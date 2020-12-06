/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';
import { URLSearch } from './URLSearch';
import { UrlList } from './UrlList';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { removeUndefinedProps } from '../../../../context/url_params_context/helpers';
import { LocalUIFilterName } from '../../../../../common/ui_filter';

export function URLFilter() {
  const history = useHistory();

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

  const name = 'transactionUrl';

  const { uiFilters } = useUrlParams();
  const { transactionUrl } = uiFilters;

  const filterValue = transactionUrl ?? [];

  return (
    <span data-cy="csmUrlFilter">
      <URLSearch
        onChange={(value) => {
          setFilterValue('transactionUrl', value);
        }}
      />
      {filterValue.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <UrlList
            onRemove={(val) => {
              setFilterValue(
                name,
                filterValue.filter((v) => val !== v)
              );
            }}
            value={filterValue}
          />
        </>
      )}
    </span>
  );
}
