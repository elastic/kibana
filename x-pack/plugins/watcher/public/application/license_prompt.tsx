/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiPageTemplate } from '@elastic/eui';
import { LicenseManagementLocator } from '@kbn/license-management-plugin/public/locator';

export const LicensePrompt = ({
  message,
  licenseManagementLocator,
}: {
  message: string | undefined;
  licenseManagementLocator?: LicenseManagementLocator;
}) => {
  const licenseManagementUrl = licenseManagementLocator?.useUrl({ page: 'dashboard' });
  // if there is no licenseManagementUrl, the license management plugin might be disabled
  const promptAction = licenseManagementUrl ? (
    <EuiLink href={licenseManagementUrl}>
      <FormattedMessage
        id="xpack.watcher.app.licenseErrorLinkText"
        defaultMessage="Manage your license"
      />
    </EuiLink>
  ) : undefined;
  const promptBody = licenseManagementUrl ? (
    <p>{message}</p>
  ) : (
    <>
      <p>{message}</p>
      <p>
        <FormattedMessage
          id="xpack.watcher.app.licenseErrorBody"
          defaultMessage="Contact your administrator to change your license."
        />
      </p>
    </>
  );
  return (
    <EuiPageTemplate.EmptyPrompt
      iconType="warning"
      color="danger"
      title={
        <h1>
          <FormattedMessage
            id="xpack.watcher.app.licenseErrorTitle"
            defaultMessage="License error"
          />
        </h1>
      }
      body={promptBody}
      actions={[promptAction]}
    />
  );
};
