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
          closeFlyout,
        },
        flyoutProps: {
          onClose: closeFlyout,
        },
      });
    }
  }, [addContentToGlobalFlyout, showFlyout, closeFlyout]);

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

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton isDisabled={isInitialRequest && isLoading}>
          {i18nTexts.startButtonLabel}
        </EuiButton>
      </EuiFlexItem>
      {data?.upgrade_status !== 'UPGRADE_NEEDED' && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => setShowFlyout(true)}>
            {i18nTexts.viewSystemIndices}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
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
