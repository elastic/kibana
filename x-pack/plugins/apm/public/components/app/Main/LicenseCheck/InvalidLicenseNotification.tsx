/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import chrome from 'ui/chrome';

const MANAGE_LICENSE_URL = `${chrome.getBasePath()}/app/kibana#/management/elasticsearch/license_management`;

export function InvalidLicenseNotification() {
  return (
    <EuiEmptyPrompt
      iconType="alert"
      iconColor="warning"
      title={<h1>Invalid license</h1>}
      body={<p>Your current license does not support the Kibana APM UI.</p>}
      actions={[
        <EuiButton href={MANAGE_LICENSE_URL}>Manage your license</EuiButton>
      ]}
    />
  );
}
