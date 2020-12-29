/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { APMLink, APMLinkExtendProps, useAPMHref } from './APMLink';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { APMQueryParams } from '../url_helpers';

const persistedFilters: Array<keyof APMQueryParams> = [
  'transactionResult',
  'host',
  'containerId',
  'podName',
  'serviceVersion',
  'latencyAggregationType',
];

function getServicePath(serviceName: string) {
  return `/services/${serviceName}`;
}

export function useServiceOrTransactionsOverviewHref(serviceName: string) {
  return useAPMHref(getServicePath(serviceName), persistedFilters);
}

interface Props extends APMLinkExtendProps {
  serviceName: string;
}

export function ServiceOrTransactionsOverviewLink({
  serviceName,
  ...rest
}: Props) {
  const { urlParams } = useUrlParams();

  return (
    <APMLink
      path={getServicePath(serviceName)}
      query={pickKeys(urlParams as APMQueryParams, ...persistedFilters)}
      {...rest}
    />
  );
}
