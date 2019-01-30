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

interface HeaderProps {
  breadcrumbs?: Breadcrumb[];
  intl: InjectedIntl;
}

export const Header = injectI18n(({ breadcrumbs = [], intl }: HeaderProps) => {
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
      {({ setBreadcrumbs }) => (
        <ExternalHeader breadcrumbs={prefixedBreadcrumbs} setBreadcrumbs={setBreadcrumbs} />
      )}
    </WithKibanaChrome>
  );
});
