/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { useBreadcrumbs, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { LOGS_APP } from '../../common/constants';
import { logsTitle } from '../translations';

export const useLogsBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const appLinkProps = useLinkProps({ app: LOGS_APP });
  const breadcrumbs = [
    {
      ...appLinkProps,
      text: logsTitle,
    },
    ...extraCrumbs,
  ];
  useBreadcrumbs(breadcrumbs, { classicOnly: true });
};
