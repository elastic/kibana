/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import type { PackageListItem } from '../../../../types';

interface Props {
  updatablePackages: PackageListItem[];
  updatableIntegrations: Record<string, any[]>;
}

export const UpgradeCallout = memo(({ updatablePackages, updatableIntegrations }: Props) => {
  const integrationsCount = Object.keys(updatableIntegrations).length;
  if (!updatablePackages.length && !integrationsCount) return null;

  const integrationsMessage = integrationsCount ? (
    <p>
      {i18n.translate('xpack.fleet.epm.integrationUpgradesAvailable', {
        defaultMessage:
          '{count, plural, one {# integration} other {# integrations}} have been upgraded, click here to upgrade your policies.',
        values: {
          count: integrationsCount,
        },
      })}
    </p>
  ) : null;

  const packagesMessage = updatablePackages.length ? (
    <p>
      {i18n.translate('xpack.fleet.epm.packageUpgradesAvailable', {
        defaultMessage:
          'Upgrades are available for {count, plural, one {# package} other {# packages}}.',
        values: {
          count: updatablePackages.length,
        },
      })}
    </p>
  ) : null;

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.fleet.epm.upgradeCalloutTitle', {
          defaultMessage: 'Upgrades available',
        })}
        iconType="alert"
      >
        {integrationsMessage}
        {packagesMessage}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
});
