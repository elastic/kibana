/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';
import { URLSearch } from './URLSearch';
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

  return (
    <span data-cy="csmUrlFilter">
      <URLSearch
        onChange={(value) => {
          setFilterValue(name, value);
        }}
      />
    </span>
  );
}
