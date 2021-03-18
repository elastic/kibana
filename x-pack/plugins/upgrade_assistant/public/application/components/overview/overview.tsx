/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

<<<<<<< HEAD:x-pack/plugins/upgrade_assistant/public/application/components/overview/overview.tsx
import { useAppContext } from '../../app_context';
import { LoadingErrorBanner } from '../error_banner';
import { LoadingState, UpgradeAssistantTabProps } from '../types';
=======
import { useAppContext } from '../../../app_context';
import { LoadingErrorBanner } from '../../error_banner';
import { UpgradeAssistantTabProps } from '../../types';
>>>>>>> 8a54a3d90420523859bcfb44923386c3b7df238c:x-pack/plugins/upgrade_assistant/public/application/components/tabs/overview/index.tsx
import { Steps } from './steps';

export const OverviewTab: FunctionComponent<UpgradeAssistantTabProps> = (props) => {
  const { kibanaVersionInfo } = useAppContext();
  const { nextMajor } = kibanaVersionInfo;

  return (
    <>
      <EuiSpacer />

      <EuiText data-test-subj="upgradeAssistantOverviewTabDetail" grow={false}>
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.overviewTab.tabDetail"
            defaultMessage="This assistant helps you prepare your cluster and indices for Elasticsearch
           {nextEsVersion} For other issues that need your attention, see the Elasticsearch logs."
            values={{
              nextEsVersion: `${nextMajor}.x`,
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer />

      {props.alertBanner && (
        <>
          {props.alertBanner}

          <EuiSpacer />
        </>
      )}

      <EuiPageContent>
        <EuiPageContentBody>
          {props.isLoading && (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          {props.checkupData && <Steps {...props} />}

          {props.loadingError && <LoadingErrorBanner loadingError={props.loadingError} />}
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
