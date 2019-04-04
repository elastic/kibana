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
  readOnlyBadge?: boolean;
  intl: InjectedIntl;
}

export const Header = injectI18n(
  ({ breadcrumbs = [], readOnlyBadge = false, intl }: HeaderProps) => (
    <WithKibanaChrome>
      {({ setBreadcrumbs, setBadge }) => (
        <ExternalHeader
          breadcrumbs={breadcrumbs}
          setBreadcrumbs={setBreadcrumbs}
          badge={
            readOnlyBadge
              ? {
                  text: intl.formatMessage({
                    defaultMessage: 'Read Only',
                    id: 'xpack.infra.header.badge.readOnly.text',
                  }),
                  tooltip: intl.formatMessage({
                    defaultMessage: 'You lack the authority',
                    id: 'xpack.infra.header.badge.readOnly.tooltip',
                  }),
                }
              : undefined
          }
          setBadge={setBadge}
        />
      )}
    </WithKibanaChrome>
  )
);
