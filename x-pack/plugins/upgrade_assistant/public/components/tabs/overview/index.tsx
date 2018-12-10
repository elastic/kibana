/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, StatelessComponent } from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  // @ts-ignore
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { CURRENT_MAJOR_VERSION, NEXT_MAJOR_VERSION } from '../../../version';
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

    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.upgradeAssistant.overviewTab.incompleteCallout.calloutTitle"
          defaultMessage="Issues list might be incomplete"
        />
      }
      color="warning"
      iconType="help"
    >
      <p>
        <FormattedMessage
          id="xpack.upgradeAssistant.overviewTab.incompleteCallout.calloutBody.calloutDetail"
          defaultMessage="The complete list of {breakingChangesDocButton} in Elasticsearch {nextEsVersion}
            will be available in the final {currentEsVersion} minor release. When the list
            is complete, this warning will go away."
          values={{
            breakingChangesDocButton: (
              <EuiLink
                href="https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes.html"
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.upgradeAssistant.overviewTab.incompleteCallout.calloutBody.breackingChangesDocButtonLabel"
                  defaultMessage="deprecations and breaking changes"
                />
              </EuiLink>
            ),
            nextEsVersion: `${NEXT_MAJOR_VERSION}.x`,
            currentEsVersion: `${CURRENT_MAJOR_VERSION}.x`,
          }}
        />
      </p>
    </EuiCallOut>

    <EuiSpacer />

    <EuiPageContent>
      <EuiPageContentBody>
        {props.loadingState === LoadingState.Success ? (
          <Steps {...props} />
        ) : (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPageContentBody>
    </EuiPageContent>
  </Fragment>
);
