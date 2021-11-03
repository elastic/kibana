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
import type { DocLinksStart } from 'src/core/public';
import { useKibana } from '../../../../shared_imports';

const i18nTexts = {
  upgradeStepTitle: (nextMajor: number) =>
    i18n.translate('xpack.upgradeAssistant.overview.upgradeStepTitle', {
      defaultMessage: 'Install {nextMajor}.0',
      values: { nextMajor },
    }),
  upgradeStepDescription: i18n.translate('xpack.upgradeAssistant.overview.upgradeStepDescription', {
    defaultMessage:
      "Once you've resolved all critical issues and verified that your applications are ready, you can upgrade the Elastic Stack.",
  }),
  upgradeStepDescriptionForCloud: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeStepDescriptionForCloud',
    {
      defaultMessage:
        "Once you've resolved all critical issues and verified that your applications are ready, you can upgrade the Elastic Stack. Upgrade your deployment on Elastic Cloud.",
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

const UpgradeStep = ({ docLinks }: { docLinks: DocLinksStart }) => {
  const { cloud } = useKibana().services;

  const isCloudEnabled: boolean = Boolean(cloud?.isCloudEnabled);
  const cloudDeploymentUrl: string = `${cloud?.baseUrl ?? ''}/deployments/${cloud?.cloudId ?? ''}`;

  let callToAction;

  if (isCloudEnabled) {
    callToAction = (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            href={cloudDeploymentUrl}
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
            href={docLinks.links.elasticsearch.setupUpgrade}
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
        href={docLinks.links.elasticsearch.setupUpgrade}
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

interface Props {
  docLinks: DocLinksStart;
  nextMajor: number;
}

export const getUpgradeStep = ({ docLinks, nextMajor }: Props): EuiStepProps => {
  return {
    title: i18nTexts.upgradeStepTitle(nextMajor),
    status: 'incomplete',
    children: <UpgradeStep docLinks={docLinks} />,
  };
};
