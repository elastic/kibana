/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';
import { ExternalHeader } from './external_header';

interface HeaderProps {
  breadcrumbs?: Breadcrumb[];
  readOnlyBadge?: boolean;
}

export const Header = ({ breadcrumbs = [], readOnlyBadge = false }: HeaderProps) => (
  <WithKibanaChrome>
    {({ setBreadcrumbs, setBadge }) => (
      <ExternalHeader
        breadcrumbs={breadcrumbs}
        setBreadcrumbs={setBreadcrumbs}
        badge={readOnlyBadge ? { text: 'Read Only', tooltip: 'You lack the authority' } : null}
        setBadge={setBadge}
      />
    )}
  </WithKibanaChrome>
);
