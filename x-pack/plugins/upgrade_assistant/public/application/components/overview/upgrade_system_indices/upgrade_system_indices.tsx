/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useState, FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';
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
  upgradeSystemIndicesTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeSystemIndicesTitle',
    {
      defaultMessage: 'Migrate system indices',
    }
  ),
  upgradeSystemIndicesBody: (docLink: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.upgradeSystemIndicesBody"
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
  startUpgradeButton: i18n.translate('xpack.upgradeAssistant.overview.startUpgradeButton', {
    defaultMessage: 'Begin upgrading system indices',
  }),
  upgradeInProgressButton: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeInProgressButton',
    {
      defaultMessage: 'Upgrading system indices',
    }
  ),
  viewSystemIndices: i18n.translate('xpack.upgradeAssistant.overview.viewSystemIndices', {
    defaultMessage: 'View system indices and status',
  }),
};

const UpgradeSystemIndicesStep: FunctionComponent = () => {
  const [showFlyout, setShowFlyout] = useState(false);

  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();

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

  return (
    <>
      <EuiText>
        <p>{i18nTexts.upgradeSystemIndicesBody(docLinks.links.elasticsearch.docsBase)}</p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton>{i18nTexts.startUpgradeButton}</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => setShowFlyout(true)}>
            {i18nTexts.viewSystemIndices}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const getUpgradeSystemIndicesStep = (): EuiStepProps => {
  return {
    title: i18nTexts.upgradeSystemIndicesTitle,
    status: 'incomplete',
    children: <UpgradeSystemIndicesStep />,
  };
};
