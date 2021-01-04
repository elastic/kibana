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
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { APMQueryParams } from '../url_helpers';
import { APMLink, APMLinkExtendProps, useAPMHref } from './APMLink';

interface ServiceOverviewLinkProps extends APMLinkExtendProps {
  serviceName: string;
}

const persistedFilters: Array<keyof APMQueryParams> = [
  'latencyAggregationType',
];

export function useServiceOverviewHref(serviceName: string) {
  return useAPMHref(`/services/${serviceName}/overview`, persistedFilters);
}

export function ServiceOverviewLink({
  serviceName,
  ...rest
}: ServiceOverviewLinkProps) {
  const { urlParams } = useUrlParams();

  return (
    <APMLink
      path={`/services/${serviceName}/overview`}
      query={pickKeys(urlParams as APMQueryParams, ...persistedFilters)}
      {...rest}
    />
  );
}
