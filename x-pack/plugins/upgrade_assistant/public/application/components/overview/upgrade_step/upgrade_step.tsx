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
  upgradeStepTitle: (currentMajor: number) =>
    i18n.translate('xpack.upgradeAssistant.overview.upgradeStepTitle', {
      defaultMessage: 'Install {currentMajor}.0',
      values: { currentMajor },
    }),
  upgradeStepDescription: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepDescription', {
    defaultMessage:
      "Once you've resolved all critical issues and verified that your applications are ready, you can upgrade the Elastic Stack.",
  }),
  upgradeStepDescriptionForCloud: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeStepDescriptionForCloud',
    {
      defaultMessage:
        "Once you've resolved all critical issues and verified that your applications are ready, you can upgrade the Elastic Stack. Upgrade your deployment on Elasic Cloud.",
    }
  ),
  upgradeStepLink: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepLink', {
    defaultMessage: 'Learn more',
  }),
};

export const getUpgradeStep = ({
  docLinks,
  isCloudEnabled,
  cloudDeploymentUrl,
  currentMajor,
}: {
  docLinks: DocLinksStart;
  isCloudEnabled: boolean;
  cloudDeploymentUrl: string;
  currentMajor: number;
}): EuiStepProps => {
  let callToAction;

  if (isCloudEnabled) {
    callToAction = (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            href={cloudDeploymentUrl}
            target="_blank"
            data-test-subj="upgradeSetupCloudLink"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.upgradeStepCloudLink"
              defaultMessage="Upgrade on Cloud"
            />
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiLink
            href={docLinks.links.elasticsearch.setupUpgrade}
            target="_blank"
            data-test-subj="upgradeSetupDocsLink"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.upgradeGuideLink"
              defaultMessage="View upgrade guide"
            />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    callToAction = (
      <EuiButton
        href={docLinks.links.elasticsearch.setupUpgrade}
        target="_blank"
        data-test-subj="upgradeSetupDocsLink"
      >
        {i18nTexts.upgradeStepLink}
        <EuiIcon type="popout" size="s" style={{ marginLeft: 4 }} />
      </EuiButton>
    );
  }

  return {
    title: i18nTexts.upgradeStepTitle(currentMajor),
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
