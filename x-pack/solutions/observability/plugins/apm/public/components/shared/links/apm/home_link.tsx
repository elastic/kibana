/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import type { APMLinkExtendProps } from './apm_link_hooks';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';

const defaultQueryParams = {
  kuery: '',
  serviceGroup: '',
  comparisonEnabled: true,
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  environment: ENVIRONMENT_ALL.value,
} as const;

function HomeLink(props: APMLinkExtendProps) {
  const { link } = useApmRouter();

  const homeLink = link('/services', {
    query: defaultQueryParams,
  });

  return <EuiLink data-test-subj="apmHomeLink" href={homeLink} {...props} />;
}
export { HomeLink };
