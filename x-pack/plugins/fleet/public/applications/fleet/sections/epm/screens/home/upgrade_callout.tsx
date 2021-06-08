/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';

import type { PackageListItem } from '../../../../types';

interface Props {
  updatablePackages: PackageListItem[];
  updatableIntegrations: Record<string, any[]>;
  linkToPackages: () => void;
}

export const UpgradeCallout = memo(
  ({ updatablePackages, updatableIntegrations, linkToPackages }: Props) => {
    const integrationsCount = Object.keys(updatableIntegrations).length;
    if (!updatablePackages.length && !integrationsCount) return null;

    const integrationsMessage = integrationsCount ? (
      <li>
        {i18n.translate('xpack.fleet.epm.integrationUpgradesAvailable', {
          defaultMessage:
            '{count, plural, one {# integration has} other {# integrations have}} been upgraded, click here to upgrade your policies.',
          values: {
            count: integrationsCount,
          },
        })}
      </li>
    ) : null;

    const packagesMessage = updatablePackages.length ? (
      <li>
        <FormattedMessage
          id="xpack.fleet.epm.packageUpgradesAvailable"
          defaultMessage="Upgrades are available for {link}."
          values={{
            link: (
              <EuiLink onClick={linkToPackages}>
                {i18n.translate('xpack.fleet.epm.packageUpgradesLink', {
                  defaultMessage: '{count, plural, one {# package} other {# packages}}',
                  values: {
                    count: updatablePackages.length,
                  },
                })}
              </EuiLink>
            ),
          }}
        />
      </li>
    ) : null;

    return (
      <>
        <EuiCallOut
          title={i18n.translate('xpack.fleet.epm.upgradeCalloutTitle', {
            defaultMessage: 'Upgrades available',
          })}
          iconType="alert"
        >
          <ul>
            {integrationsMessage}
            {packagesMessage}
          </ul>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }
);
