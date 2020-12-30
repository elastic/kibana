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
  'host',
  'containerId',
  'podName',
  'serviceVersion',
];

export function useServiceNodeOverviewHref(serviceName: string) {
  return useAPMHref(`/services/${serviceName}/nodes`, persistedFilters);
}

interface Props extends APMLinkExtendProps {
  serviceName: string;
}

export function ServiceNodeOverviewLink({ serviceName, ...rest }: Props) {
  const { urlParams } = useUrlParams();

  return (
    <APMLink
      path={`/services/${serviceName}/nodes`}
      query={pickKeys(urlParams as APMQueryParams, ...persistedFilters)}
      {...rest}
    />
  );
}
