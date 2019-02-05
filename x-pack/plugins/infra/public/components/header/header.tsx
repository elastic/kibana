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
}

export const Header = ({ breadcrumbs = [] }: HeaderProps) => (
  <WithKibanaChrome>
    {({ setBreadcrumbs }) => (
      <ExternalHeader breadcrumbs={breadcrumbs} setBreadcrumbs={setBreadcrumbs} />
    )}
  </WithKibanaChrome>
);
