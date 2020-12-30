/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { APMQueryParams } from '../url_helpers';
import { APMLink, APMLinkExtendProps, useAPMHref } from './APMLink';

const persistedFilters: Array<keyof APMQueryParams> = [
  'transactionResult',
  'host',
  'containerId',
  'podName',
];

export function useTraceOverviewHref() {
  return useAPMHref('/traces', persistedFilters);
}

export function TraceOverviewLink(props: APMLinkExtendProps) {
  const { urlParams } = useUrlParams();

  return (
    <APMLink
      path="/traces"
      query={pickKeys(urlParams as APMQueryParams, ...persistedFilters)}
      {...props}
    />
  );
}
