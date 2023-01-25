/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { PackagePolicyEditExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyEditExtensionWrapper = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const { http } = useKibana().services;

    if (currentPolicy.is_managed) {
      return (
        <EuiCallOut>
          <p>{EDIT_IN_UPTIME_DESC}</p>
          {/* TODO Add a link to exact monitor*/}
          <EuiButton href={`${http?.basePath.get()}/app/uptime/manage-monitors/all`}>
            {EDIT_IN_UPTIME_LABEL}
          </EuiButton>
        </EuiCallOut>
      );
    } else {
      return (
        <EuiCallOut>
          <p>{EDIT_DISABLE_DESC}</p>
          {/* TODO Add a link to exact monitor*/}
          <EuiButton href={`${http?.basePath.get()}/app/uptime/manage-monitors/all`}>
            {EDIT_IN_UPTIME_LABEL}
          </EuiButton>
        </EuiCallOut>
      );
    }
  }
);
SyntheticsPolicyEditExtensionWrapper.displayName = 'SyntheticsPolicyEditExtensionWrapper';

const EDIT_IN_UPTIME_LABEL = i18n.translate('xpack.synthetics.editPackagePolicy.inUptime', {
  defaultMessage: 'Edit in uptime',
});

const EDIT_IN_UPTIME_DESC = i18n.translate('xpack.synthetics.editPackagePolicy.inUptimeDesc', {
  defaultMessage: 'This package policy is managed by uptime app.',
});
const EDIT_DISABLE_DESC = i18n.translate('xpack.synthetics.editPackagePolicy.disableUptimeDesc', {
  defaultMessage:
    'We no longer support adding/editing integerations. You can use uptime app to add/edit monitors in private locations.',
});
