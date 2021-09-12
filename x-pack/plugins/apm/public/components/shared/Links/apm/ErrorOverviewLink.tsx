/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { APMQueryParams } from '../url_helpers';
import { APMLink, APMLinkExtendProps } from './APMLink';

const persistedFilters: Array<keyof APMQueryParams> = [
  'host',
  'containerId',
  'podName',
  'serviceVersion',
];

interface Props extends APMLinkExtendProps {
  serviceName: string;
  query?: APMQueryParams;
}

export function ErrorOverviewLink({ serviceName, query, ...rest }: Props) {
  const { urlParams } = useUrlParams();

  return (
    <APMLink
      path={`/services/${serviceName}/errors`}
      query={{
        ...pickKeys(urlParams as APMQueryParams, ...persistedFilters),
        ...query,
      }}
      {...rest}
    />
  );
}
