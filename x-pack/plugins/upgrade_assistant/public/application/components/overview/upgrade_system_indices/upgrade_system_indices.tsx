/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useState, FunctionComponent } from 'react';

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

import type { ResponseError } from '../../../lib/api';
import { SystemIndicesFlyout, SystemIndicesFlyoutProps } from './flyout';
import { GlobalFlyout } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';

const FLYOUT_ID = 'upgradeSystemIndicesFlyout';
const { useGlobalFlyout } = GlobalFlyout;

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
      // NOTE: This could be that all indices have either been upgraded or dont need to be upgraded
      defaultMessage: 'All system indices have been upgraded',
    }
  ),
  viewSystemIndices: i18n.translate(
    'xpack.upgradeAssistant.system_indices.overview.system_indices.viewSystemIndices',
    {
      defaultMessage: 'View system indices and status',
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

const UpgradeSystemIndicesStep: FunctionComponent = () => {
  const {
    services: { api },
  } = useAppContext();
  const [statusStartUpgrade, setStatusStartUpgrade] = useState<{
    statusType: string;
    details?: ResponseError;
  }>({ statusType: 'idle' });

  const [showFlyout, setShowFlyout] = useState(false);
  const {
    data,
    error,
    resendRequest: refetchSystemIndicesStatus,
    isLoading,
    isInitialRequest,
  } = api.useLoadSystemIndicesUpgradeStatus();

  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const closeFlyout = useCallback(() => {
    setShowFlyout(false);
    removeContentFromGlobalFlyout(FLYOUT_ID);
  }, [removeContentFromGlobalFlyout]);

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout<SystemIndicesFlyoutProps>({
        id: FLYOUT_ID,
        Component: SystemIndicesFlyout,
        props: {
          data: data!,
          closeFlyout,
        },
        flyoutProps: {
          onClose: closeFlyout,
        },
      });
    }
  }, [addContentToGlobalFlyout, data, showFlyout, closeFlyout]);

  const beginSystemIndicesUpgrade = useCallback(async () => {
    const { error: startUpgradeError } = await api.upgradeSystemIndices();

    setStatusStartUpgrade({
      statusType: startUpgradeError ? 'error' : 'started',
      details: startUpgradeError ?? undefined,
    });

    if (!startUpgradeError) {
      refetchSystemIndicesStatus();
    }
  }, [api, refetchSystemIndicesStatus]);

  if (error) {
    return (
      <EuiCallOut
        title={i18nTexts.loadingError}
        color="danger"
        iconType="alert"
        data-test-subj="systemIndicesErrorCallout"
      >
        <p>
          {error.statusCode} - {error.message}
        </p>
        <EuiButton color="danger" isLoading={isLoading} onClick={refetchSystemIndicesStatus}>
          {i18nTexts.retryButtonLabel}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (data?.upgrade_status === 'NO_UPGRADE_NEEDED') {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
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

  const isButtonDisabled = isInitialRequest && isLoading;
  const isUpgrading = data?.upgrade_status === 'IN_PROGRESS';

  return (
    <>
      {statusStartUpgrade.statusType === 'error' && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            iconType="alert"
            title={`${statusStartUpgrade.details!.statusCode} - ${
              statusStartUpgrade.details!.message
            }`}
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
          >
            {isUpgrading ? i18nTexts.inProgressButtonLabel : i18nTexts.startButtonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => setShowFlyout(true)} isDisabled={isButtonDisabled}>
            {i18nTexts.viewSystemIndices}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const getUpgradeSystemIndicesStep = ({
  docLinks,
}: {
  docLinks: DocLinksStart;
}): EuiStepProps => {
  return {
    title: i18nTexts.title,
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>{i18nTexts.bodyDescription(docLinks.links.elasticsearch.docsBase)}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <UpgradeSystemIndicesStep />
      </>
    ),
  };
};
