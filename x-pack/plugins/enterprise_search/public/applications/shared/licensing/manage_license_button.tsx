/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiButtonProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { docLinks } from '../doc_links';
import { EuiButtonTo } from '../react_router_helpers';

import { LicensingLogic } from './licensing_logic';

export const ManageLicenseButton: React.FC<EuiButtonProps> = (props) => {
  const { canManageLicense } = useValues(LicensingLogic);

  return canManageLicense ? (
    <EuiButtonTo
      {...props}
      color="primary"
      size="s"
      to="/app/management/stack/license_management"
      shouldNotCreateHref
    >
      {i18n.translate('xpack.enterpriseSearch.licenseManagementLink', {
        defaultMessage: 'Manage your license',
      })}
    </EuiButtonTo>
  ) : (
    <EuiButton {...props} target="_blank" iconType="popout" href={docLinks.licenseManagement}>
      {i18n.translate('xpack.enterpriseSearch.licenseDocumentationLink', {
        defaultMessage: 'Learn more about license features',
      })}
    </EuiButton>
  );
};
