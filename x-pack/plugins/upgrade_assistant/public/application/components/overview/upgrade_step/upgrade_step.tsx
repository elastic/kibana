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
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import { useAppContext } from '../../../app_context';

const i18nTexts = {
  upgradeStepTitle: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepTitle', {
    defaultMessage: 'Upgrade to Elastic 8.x',
  }),
  upgradeStepDescription: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepDescription', {
    defaultMessage:
      'Once you’ve resolved all critical issues and verified that your applications are ready, you can upgrade to Elastic 8.x. Be sure to back up your data again before upgrading.',
  }),
  upgradeStepDescriptionForCloud: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeStepDescriptionForCloud',
    {
      defaultMessage:
        "Once you've resolved all critical issues and verified that your applications are ready, you can upgrade to Elastic 8.x. Be sure to back up your data again before upgrading. Upgrade your deployment on Elastic Cloud.",
    }
  ),
  upgradeStepLink: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepLink', {
    defaultMessage: 'Learn more',
  }),
  upgradeStepCloudLink: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepCloudLink', {
    defaultMessage: 'Upgrade on Cloud',
  }),
  upgradeGuideLink: i18n.translate('xpack.upgradeAssistant.overview.upgradeGuideLink', {
    defaultMessage: 'View upgrade guide',
  }),
};

const UpgradeStep = () => {
  const {
    plugins: { cloud },
    services: {
      core: { docLinks },
    },
  } = useAppContext();
  const isCloudEnabled: boolean = Boolean(cloud?.isCloudEnabled);
  let callToAction;

  if (isCloudEnabled) {
    const upgradeOnCloudUrl = cloud!.deploymentUrl + '?show_upgrade=true';
    callToAction = (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            href={upgradeOnCloudUrl}
            target="_blank"
            data-test-subj="upgradeSetupCloudLink"
            iconSide="right"
            iconType="popout"
          >
            {i18nTexts.upgradeStepCloudLink}
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            href={docLinks.links.upgrade.upgradingElasticStack}
            target="_blank"
            data-test-subj="upgradeSetupDocsLink"
            iconSide="right"
            iconType="popout"
          >
            {i18nTexts.upgradeGuideLink}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    callToAction = (
      <EuiButton
        href={docLinks.links.upgrade.upgradingElasticStack}
        target="_blank"
        data-test-subj="upgradeSetupDocsLink"
        iconSide="right"
        iconType="popout"
      >
        {i18nTexts.upgradeStepLink}
      </EuiButton>
    );
  }

  return (
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
  );
};

export const getUpgradeStep = (): EuiStepProps => {
  return {
    title: i18nTexts.upgradeStepTitle,
    status: 'incomplete',
    'data-test-subj': 'upgradeStep',
    children: <UpgradeStep />,
  };
};
