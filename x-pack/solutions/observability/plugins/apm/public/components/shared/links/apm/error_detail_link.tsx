/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import { EuiLink } from '@elastic/eui';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import type { APMLinkExtendProps } from './apm_link_hooks';
import type { ApmRoutes } from '../../../routing/apm_route_config';

interface Props {
  serviceName: string;
  errorGroupId: string;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/errors/{groupId}'>['query'];
}

function ErrorDetailLink({
  serviceName,
  errorGroupId,
  query,
  ...rest
}: Props & APMLinkExtendProps) {
  const { link } = useApmRouter();
  const errorDetailsLink = link('/services/{serviceName}/errors/{groupId}', {
    path: {
      serviceName,
      groupId: errorGroupId,
    },
    query,
  });
  return <EuiLink data-test-subj="apmErrorDetailsLink" href={errorDetailsLink} {...rest} />;
}

function useGetErrorDetailLink() {
  const { link } = useApmRouter();
  return ({ serviceName, errorGroupId, query }: Props) => {
    return link('/services/{serviceName}/errors/{groupId}', {
      path: {
        serviceName,
        groupId: errorGroupId,
      },
      query,
    });
  };
}

export { ErrorDetailLink, useGetErrorDetailLink };
