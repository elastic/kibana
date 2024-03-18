/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { TypeOf } from '@kbn/typed-react-router-config';
import { useApmRouter } from '../../../../../hooks/use_apm_router';
import { mobileServiceDetailRoute } from '../../../../routing/mobile_service_detail';

interface Props {
  children: React.ReactNode;
  title?: string;
  serviceName: string;
  query: TypeOf<
    typeof mobileServiceDetailRoute,
    '/mobile-services/{serviceName}/errors-and-crashes'
  >['query'];
}

export function ErrorOverviewLink({ serviceName, query, ...rest }: Props) {
  const router = useApmRouter();
  const errorOverviewLink = router.link(
    '/mobile-services/{serviceName}/errors-and-crashes',
    {
      path: {
        serviceName,
      },
      query,
    }
  );

  return (
    <EuiLink
      data-test-subj="apmErrorOverviewLinkLink"
      href={errorOverviewLink}
      {...rest}
    />
  );
}
