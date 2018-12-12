/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';
import { ExternalHeader } from './external_header';
import { LegacyHeader } from './legacy_header';

interface HeaderProps {
  breadcrumbs?: Breadcrumb[];
  appendSections?: React.ReactNode;
  intl: InjectedIntl;
}

export const Header = injectI18n(({ appendSections, breadcrumbs = [], intl }: HeaderProps) => {
  const prefixedBreadcrumbs = [
    {
      href: '#/',
      text: intl.formatMessage({
        id: 'xpack.infra.header.infrastructureTitle',
        defaultMessage: 'Infrastructure',
      }),
    },
    ...(breadcrumbs || []),
  ];

  return (
    <WithKibanaChrome>
      {({ setBreadcrumbs, uiSettings: { k7Design } }) =>
        k7Design ? (
          <ExternalHeader breadcrumbs={prefixedBreadcrumbs} setBreadcrumbs={setBreadcrumbs} />
        ) : (
          <LegacyHeader appendSections={appendSections} breadcrumbs={prefixedBreadcrumbs} />
        )
      }
    </WithKibanaChrome>
  );
});
