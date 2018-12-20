/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { injectI18n } from '@kbn/i18n/react';

import { EuiCallOut } from '@elastic/eui';

export function SectionUnauthorizedUI({ intl, children }) {
  const title = intl.formatMessage({
    id: 'xpack.crossClusterReplication.remoteClusterList.noPermissionTitle',
    defaultMessage: 'Permission error',
  });
  return (
    <Fragment>
      <EuiCallOut
        title={title}
        color="warning"
        iconType="help"
      >
        {children}
      </EuiCallOut>
    </Fragment>
  );
}

export const SectionUnauthorized = injectI18n(SectionUnauthorizedUI);
