/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useUpgradeApmPackagePolicyHref } from '../../../../shared/links/kibana';
import { CardFooterContent } from './card_footer_content';

export function UpgradeAvailableCard({
  apmPackagePolicyId,
}: {
  apmPackagePolicyId: string | undefined;
}) {
  const upgradeApmPackagePolicyHref =
    useUpgradeApmPackagePolicyHref(apmPackagePolicyId);

  return (
    <EuiCard
      icon={<EuiIcon size="xxl" type="alert" color="warning" />}
      title={i18n.translate(
        'xpack.apm.settings.schema.upgradeAvailable.title',
        {
          defaultMessage: 'APM integration upgrade available!',
        }
      )}
      description={
        <FormattedMessage
          id="xpack.apm.settings.upgradeAvailable.description"
          defaultMessage="Even though your APM integration is setup, a new version of the APM integration is available for upgrade with your package policy. {upgradePackagePolicyLink} to get the most out of your setup."
          values={{
            upgradePackagePolicyLink: (
              <EuiLink href={upgradeApmPackagePolicyHref}>
                {i18n.translate(
                  'xpack.apm.settings.schema.upgradeAvailable.upgradePackagePolicyLink',
                  { defaultMessage: 'Upgrade your APM integration' }
                )}
              </EuiLink>
            ),
          }}
        />
      }
      footer={<CardFooterContent />}
    />
  );
}
