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
  EuiCallOut,
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
  upgradeStepCloudLink: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepCloudLink', {
    defaultMessage: 'Upgrade on Cloud',
  }),
  loadingUpgradeStatus: i18n.translate('xpack.upgradeAssistant.overview.loadingUpgradeStatus', {
    defaultMessage: 'Loading upgrade status',
  }),
  upgradeGuideLink: i18n.translate('xpack.upgradeAssistant.overview.upgradeGuideLink', {
    defaultMessage: 'View upgrade guide',
  }),
};

const UpgradeStep = () => {
  const {
    plugins: { cloud },
    services: {
      api,
      core: { docLinks },
    },
  } = useAppContext();
  const isCloudEnabled: boolean = Boolean(cloud?.isCloudEnabled);

  const { data: upgradeStatus, isLoading, error, resendRequest } = api.useLoadUpgradeStatus();

  let callToAction;

  if (isCloudEnabled) {
    if (error) {
      callToAction = (
        <EuiCallOut
          title={i18n.translate('xpack.upgradeAssistant.overview.errorLoadingUpgradeStatus', {
            defaultMessage: 'An error occurred while retrieving the upgrade status',
          })}
          color="danger"
          iconType="alert"
          data-test-subj="upgradeStatusErrorCallout"
        >
          <p>
            {error.statusCode} - {error.message}
          </p>
          <EuiButton
            color="danger"
            onClick={resendRequest}
            data-test-subj="upgradeStatusRetryButton"
            isLoading={isLoading}
          >
            {i18n.translate('xpack.upgradeAssistant.overview.upgradeStatus.retryButton', {
              defaultMessage: 'Try again',
            })}
          </EuiButton>
        </EuiCallOut>
      );
    } else {
      const readyForUpgrade = upgradeStatus?.readyForUpgrade;
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
              isLoading={isLoading}
              isDisabled={!readyForUpgrade}
            >
              {isLoading ? i18nTexts.loadingUpgradeStatus : i18nTexts.upgradeStepCloudLink}
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={docLinks.links.upgrade.upgradingStackOnCloud}
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
    }
  } else {
    callToAction = (
      <EuiButton
        href={docLinks.links.upgrade.upgradingStackOnPrem}
        target="_blank"
        data-test-subj="upgradeSetupDocsLink"
        iconSide="right"
        iconType="popout"
      >
        {i18nTexts.upgradeGuideLink}
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
