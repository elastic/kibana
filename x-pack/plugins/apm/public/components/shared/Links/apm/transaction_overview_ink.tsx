/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { APMLink, APMLinkExtendProps } from './APMLink';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { APMQueryParams } from '../url_helpers';

interface Props extends APMLinkExtendProps {
  serviceName: string;
}

const persistedFilters: Array<keyof APMQueryParams> = [
  'latencyAggregationType',
];

export function TransactionOverviewLink({ serviceName, ...rest }: Props) {
  const { urlParams } = useUrlParams();

  return (
    <APMLink
      path={`/services/${serviceName}/transactions/`}
      query={pickKeys(urlParams as APMQueryParams, ...persistedFilters)}
      {...rest}
    />
  );
}
