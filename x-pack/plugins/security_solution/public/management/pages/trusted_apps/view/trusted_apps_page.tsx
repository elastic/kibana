/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { AdministrationListPage } from '../../../components/administration_list_page';

export function TrustedAppsPage() {
  return (
    <AdministrationListPage
      beta={true}
      title={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.list.pageTitle"
          defaultMessage="Trusted Applications"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.list.pageSubTitle"
          defaultMessage="View and configure trusted applications"
        />
      }
    />
  );
}
