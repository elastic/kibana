/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';
import { ExternalHeader } from './external_header';
import { LegacyHeader } from './legacy_header';

interface HeaderProps {
  breadcrumbs?: Breadcrumb[];
  appendSections?: React.ReactNode;
}

export const Header = ({ appendSections, breadcrumbs = [] }: HeaderProps) => {
  return (
    <WithKibanaChrome>
      {({ setBreadcrumbs, uiSettings: { k7Design } }) =>
        k7Design ? (
          <ExternalHeader breadcrumbs={breadcrumbs} setBreadcrumbs={setBreadcrumbs} />
        ) : (
          <LegacyHeader appendSections={appendSections} breadcrumbs={breadcrumbs} />
        )
      }
    </WithKibanaChrome>
  );
};
