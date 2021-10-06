/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import type { DocLinksStart } from 'src/core/public';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiLink,
  EuiIcon,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import type { OverviewStepProps } from '../../types';
import { useSystemIndicesUpgrade } from './use_system_indices_upgrade';

interface Props {
  setIsComplete: OverviewStepProps['setIsComplete'];
}

interface StepProps extends OverviewStepProps {
  docLinks: DocLinksStart;
}

const i18nTexts = {
  title: i18n.translate('xpack.upgradeAssistant.overview.system_indices.title', {
    defaultMessage: 'Upgrade system indices',
  }),
  bodyDescription: (docLink: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.system_indices.body"
      defaultMessage="Upgrade your system indices to keep them happy. In addition to regular checkups, it is recommended that you brush and floss your indices twice per day. {learnMoreLink}."
      values={{
        learnMoreLink: (
          <EuiLink href={docLink} target="_blank">
            Learn more
          </EuiLink>
        ),
      }}
    />
  ),
  startButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.system_indices.startButtonLabel',
    {
      defaultMessage: 'Begin upgrading system indices',
    }
  ),
  inProgressButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.system_indices.inProgressButtonLabel',
    {
      defaultMessage: 'Upgrading system indices',
    }
  ),
  noUpgradeNeeded: i18n.translate(
    'xpack.upgradeAssistant.overview.system_indices.noUpgradeNeeded',
    {
      defaultMessage: 'All system indices have been upgraded',
    }
  ),
  viewSystemIndicesStatus: i18n.translate(
    'xpack.upgradeAssistant.system_indices.overview.system_indices.viewSystemIndicesStatus',
    {
      defaultMessage: 'View status',
    }
  ),
  retryButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.system_indices.retryButtonLabel',
    {
      defaultMessage: 'Try again',
    }
  ),
  loadingError: i18n.translate('xpack.upgradeAssistant.overview.system_indices.loadingError', {
    defaultMessage: 'An error occurred while retrieving the status of system indices',
  }),
};

const UpgradeSystemIndicesStep: FunctionComponent<Props> = ({ setIsComplete }) => {
  const { beginSystemIndicesUpgrade, startUpgradeStatus, upgradeStatus, setShowFlyout } =
    useSystemIndicesUpgrade();

  useEffect(() => {
    setIsComplete(upgradeStatus.data?.upgrade_status === 'NO_UPGRADE_NEEDED');
    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgradeStatus.data?.upgrade_status]);

  if (upgradeStatus.error) {
    return (
      <EuiCallOut
        title={i18nTexts.loadingError}
        color="danger"
        iconType="alert"
        data-test-subj="systemIndicesStatusErrorCallout"
      >
        <p>
          {upgradeStatus.error.statusCode} - {upgradeStatus.error.message}
        </p>
        <EuiButton
          color="danger"
          isLoading={upgradeStatus.isLoading}
          onClick={upgradeStatus.resendRequest}
          data-test-subj="systemIndicesStatusRetryButton"
        >
          {i18nTexts.retryButtonLabel}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (upgradeStatus.data?.upgrade_status === 'NO_UPGRADE_NEEDED') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="noUpgradeNeededSection">
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="green">
            <p>{i18nTexts.noUpgradeNeeded}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const isButtonDisabled = upgradeStatus.isInitialRequest && upgradeStatus.isLoading;
  const isUpgrading = upgradeStatus.data?.upgrade_status === 'IN_PROGRESS';

  return (
    <>
      {startUpgradeStatus.statusType === 'error' && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            iconType="alert"
            title={`${startUpgradeStatus.error!.statusCode} - ${startUpgradeStatus.error!.message}`}
            data-test-subj="startSystemIndicesUpgradeCalloutError"
          />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            isLoading={isUpgrading}
            isDisabled={isButtonDisabled}
            onClick={beginSystemIndicesUpgrade}
            data-test-subj="startSystemIndicesUpgradeButton"
          >
            {isUpgrading ? i18nTexts.inProgressButtonLabel : i18nTexts.startButtonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={() => setShowFlyout(true)}
            isDisabled={isButtonDisabled}
            data-test-subj="viewSystemIndicesStateButton"
          >
            {i18nTexts.viewSystemIndicesStatus}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const getUpgradeSystemIndicesStep = ({
  docLinks,
  isComplete,
  setIsComplete,
}: StepProps): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  return {
    title: i18nTexts.title,
    status,
    'data-test-subj': `upgradeSystemIndicesStep-${status}`,
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.bodyDescription(docLinks.links.upgradeAssistant.systemFeaturesUpgrade)}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <UpgradeSystemIndicesStep setIsComplete={setIsComplete} />
      </>
    ),
  };
};
