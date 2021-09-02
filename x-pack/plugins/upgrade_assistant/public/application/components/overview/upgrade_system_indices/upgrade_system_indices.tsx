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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { SystemIndicesFlyout, SystemIndicesFlyoutProps } from './flyout';
import { GlobalFlyout } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';

const FLYOUT_ID = 'upgradeSystemIndicesFlyout';
const { useGlobalFlyout } = GlobalFlyout;

const i18nTexts = {
  title: i18n.translate('xpack.upgradeAssistant.overview.system_indices.title', {
    defaultMessage: 'Migrate system indices',
  }),
  bodyDescription: (docLink: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.system_indices.body"
      defaultMessage="Migrate your system indices to keep them happy. In addition to regular checkups, it is recommended that you brush and floss your indices twice per day. {learnMoreLink}."
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
  inProgressButtonLabel: i18n.translate('xpack.upgradeAssistant.overview.inProgressButtonLabel', {
    defaultMessage: 'Upgrading system indices',
  }),
  noUpgradeNeeded: i18n.translate('xpack.upgradeAssistant.overview.noUpgradeNeeded', {
    // NOTE: This could be that all indices have either been upgraded or dont need to be upgraded
    defaultMessage: 'All system indices have been upgraded',
  }),
  viewSystemIndices: i18n.translate(
    'xpack.upgradeAssistant.system_indices.overview.viewSystemIndices',
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
};

const UpgradeSystemIndicesStep: FunctionComponent = () => {
  const {
    services: { api },
  } = useAppContext();

  const [showFlyout, setShowFlyout] = useState(false);
  const {
    data,
    error,
    resendRequest,
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

  if (error) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton color="danger" isLoading={isLoading} onClick={resendRequest}>
            {i18nTexts.retryButtonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="danger">
            <p>
              {error.statusCode} - {error.message}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
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
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton isLoading={isUpgrading} isDisabled={isButtonDisabled}>
          {isUpgrading ? i18nTexts.inProgressButtonLabel : i18nTexts.startButtonLabel}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={() => setShowFlyout(true)} isDisabled={isButtonDisabled}>
          {i18nTexts.viewSystemIndices}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
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
