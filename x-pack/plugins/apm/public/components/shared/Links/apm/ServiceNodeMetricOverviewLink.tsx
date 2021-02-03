/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { APMLink, APMLinkExtendProps } from './APMLink';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { pickKeys } from '../../../../../common/utils/pick_keys';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  serviceNodeName: string;
}

function ServiceNodeMetricOverviewLink({
  serviceName,
  serviceNodeName,
  ...rest
}: Props) {
  const { urlParams } = useUrlParams();

  const persistedFilters = pickKeys(
    urlParams,
    'host',
    'containerId',
    'podName',
    'serviceVersion'
  );

  return (
    <APMLink
      path={`/services/${serviceName}/nodes/${encodeURIComponent(
        serviceNodeName
      )}/metrics`}
      query={persistedFilters}
      {...rest}
    />
  );
}

export { ServiceNodeMetricOverviewLink };
