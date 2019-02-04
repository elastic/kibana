/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, StatelessComponent } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  // @ts-ignore
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { NEXT_MAJOR_VERSION } from '../../../../common/version';
import { LoadingErrorBanner } from '../../error_banner';
import { LoadingState, UpgradeAssistantTabProps } from '../../types';
import { Steps } from './steps';

export const OverviewTab: StatelessComponent<UpgradeAssistantTabProps> = props => (
  <Fragment>
    <EuiSpacer />

    <EuiText grow={false}>
      <p>
        <FormattedMessage
          id="xpack.upgradeAssistant.overviewTab.tabDetail"
          defaultMessage="This assistant checks your cluster and indices and identifies the changes
             you need to make before upgrading to Elasticsearch {nextEsVersion}."
          values={{
            nextEsVersion: `${NEXT_MAJOR_VERSION}.x`,
          }}
        />
      </p>
    </EuiText>

    <EuiSpacer />

    {props.alertBanner && (
      <Fragment>
        {props.alertBanner}

        <EuiSpacer />
      </Fragment>
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
  </Fragment>
);
