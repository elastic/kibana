/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import orderBy from 'lodash.orderby';
import { createSelector } from 'reselect';
import { loadServiceList } from '../services/rest';
import { ReduxRequest } from '../components/shared/ReduxRequest';

const ID = 'serviceList';
const INITIAL_STATE = { data: [] };

export const getServiceList = createSelector(
  state => state.reduxRequest[ID],
  state => state.sorting.service,
  (serviceList = INITIAL_STATE, serviceSorting) => {
    const { key: sortKey, descending } = serviceSorting;

    return {
      ...serviceList,
      data: orderBy(serviceList.data, sortKey, descending ? 'desc' : 'asc')
    };
  }
);

export function ServiceListRequest({ urlParams, render }) {
  const { start, end, kuery } = urlParams;
  return (
    <ReduxRequest
      id={ID}
      fn={loadServiceList}
      args={[{ start, end, kuery }]}
      selector={getServiceList}
      render={render}
    />
  );
}
