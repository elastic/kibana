/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useProfilingDependencies } from '../../contexts/profiling_dependencies/use_profiling_dependencies';

interface Props {
  text: string;
}

const KIBANA_LICENSE_MANAGEMENT_URL = '/app/management/stack/license_management';

export function LicensePrompt({ text }: Props) {
  const { core } = useProfilingDependencies().start;
  const manageLicenseURL = url.format({
    pathname: core.http.basePath.prepend(KIBANA_LICENSE_MANAGEMENT_URL),
  });

  return (
    <EuiEmptyPrompt
      iconType="warning"
      iconColor="warning"
      title={
        <h1>
          {i18n.translate('xpack.profiling.invalidLicense.title', {
            defaultMessage: 'Invalid License',
          })}
        </h1>
      }
      body={<p>{text}</p>}
      actions={[
        <EuiButton href={manageLicenseURL}>
          {i18n.translate('xpack.profiling.invalidLicense.licenseManagementLink', {
            defaultMessage: 'Manage your license',
          })}
        </EuiButton>,
      ]}
    />
  );
}
