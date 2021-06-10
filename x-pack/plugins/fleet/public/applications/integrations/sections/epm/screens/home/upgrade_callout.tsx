/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';

import { useLink } from '../../../../hooks';

import type { PackageListItem } from '../../../../types';

interface Props {
  updatablePackages: PackageListItem[];
  updatableIntegrations: Map<string, any[]>;
  onLinkToPackages: () => void;
}

export const UpgradeCallout: React.FC<Props> = memo(
  ({ updatablePackages, updatableIntegrations, onLinkToPackages }) => {
    const { getHref } = useLink();

    const packagesOnClick = useCallback(() => {
      onLinkToPackages();
      window.location.href = getHref('integrations_installed');
    }, [onLinkToPackages, getHref]);

    if (!updatablePackages.length && !updatableIntegrations.size) return null;

    const integrationsMessage = updatableIntegrations.size ? (
      <li>
        {i18n.translate('xpack.fleet.epm.integrationUpgradesAvailable', {
          defaultMessage:
            '{count, plural, one {# integration has} other {# integrations have}} been upgraded, click here to upgrade your policies.',
          values: {
            count: updatableIntegrations.size,
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
              <EuiLink onClick={packagesOnClick}>
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
