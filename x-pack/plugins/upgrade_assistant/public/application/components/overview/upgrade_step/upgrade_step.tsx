/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiButton,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import type { DocLinksStart } from 'src/core/public';

const i18nTexts = {
  upgradeStepTitle: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepTitle', {
    defaultMessage: 'Upgrade the Stack',
  }),
  upgradeStepDescription: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepDescription', {
    defaultMessage:
      'After you have resolved your deprecations issues and are satisfied with the deprecation logs, it is time to upgrade. Follow the instructions in our documentation to complete your update.',
  }),
  upgradeStepDescriptionForCloud: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeStepDescriptionForCloud',
    {
      defaultMessage:
        'After you have resolved your deprecations issues and are satisfied with the deprecation logs, it is time to upgrade. Upgrade your deployment on Elasic Cloud.',
    }
  ),
  upgradeStepLink: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepLink', {
    defaultMessage: 'Follow the upgrade guide',
  }),
};

export const getUpgradeStep = ({
  docLinks,
  isCloudEnabled,
  cloudDeploymentUrl,
}: {
  docLinks: DocLinksStart;
  isCloudEnabled: boolean;
  cloudDeploymentUrl: string;
}): EuiStepProps => {
  let callToAction;

  if (isCloudEnabled) {
    callToAction = (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton href={cloudDeploymentUrl} target="_blank">
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.upgradeStepCloudLink"
              defaultMessage="Upgrade on Cloud"
            />
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiLink href={docLinks.links.elasticsearch.migrating8} target="_blank">
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.pageDescriptionLink"
              defaultMessage="View upgrade guide"
            />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    callToAction = (
      <EuiButton href={docLinks.links.elasticsearch.migrating8} target="_blank">
        {i18nTexts.upgradeStepLink}
        <EuiIcon type="popout" size="s" style={{ marginLeft: 4 }} />
      </EuiButton>
    );
  }

  return {
    title: i18nTexts.upgradeStepTitle,
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>
            {isCloudEnabled
              ? i18nTexts.upgradeStepDescriptionForCloud
              : i18nTexts.upgradeStepDescription}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        {callToAction}
      </>
    ),
  };
};
