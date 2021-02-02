/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

import { useAppContext } from '../../../app_context';
import { LoadingErrorBanner } from '../../error_banner';
import { LoadingState, UpgradeAssistantTabProps } from '../../types';
import { Steps } from './steps';

export const OverviewTab: FunctionComponent<UpgradeAssistantTabProps> = (props) => {
  const { kibanaVersionInfo } = useAppContext();
  const { nextMajor } = kibanaVersionInfo;

  return (
    <>
      <EuiSpacer />

      <EuiText grow={false}>
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
          {props.loadingState === LoadingState.Success && <Steps {...props} />}

          {props.loadingState === LoadingState.Loading && (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          {props.loadingState === LoadingState.Error && (
            <LoadingErrorBanner loadingError={props.loadingError} />
          )}
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
