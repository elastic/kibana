/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { getIndexListUri } from '../../../../../../../../index_management/public/services/navigation';


import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import {
  AutoFollowPatternIndicesPreview,
  AutoFollowPatternDeleteProvider,
} from '../../../../../components';

import { API_STATUS } from '../../../../../constants';
import routing from '../../../../../services/routing';

export class DetailPanelUi extends Component {
  static propTypes = {
    apiStatus: PropTypes.string,
    autoFollowPatternId: PropTypes.string,
    autoFollowPattern: PropTypes.object,
    closeDetailPanel: PropTypes.func.isRequired,
  }

  renderAutoFollowPattern() {
    const {
      autoFollowPattern: {
        followIndexPatternPrefix,
        followIndexPatternSuffix,
        remoteCluster,
        leaderIndexPatterns,
      },
    } = this.props;

    let indexManagementFilter;
    if(followIndexPatternPrefix) {
      indexManagementFilter = `name:${followIndexPatternPrefix}`;
    } else if(followIndexPatternSuffix) {
      indexManagementFilter = `name:${followIndexPatternSuffix}`;
    }
    const indexManagementUri = getIndexListUri(indexManagementFilter);

    return (
      <Fragment>
        <EuiFlyoutBody>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.statusTitle"
                defaultMessage="Settings"
              />
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiDescriptionList>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  <EuiTitle size="xs">
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.remoteClusterLabel"
                      defaultMessage="Remote cluster"
                    />
                  </EuiTitle>
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription>
                  {remoteCluster}
                </EuiDescriptionListDescription>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  <EuiTitle size="xs">
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.leaderPatternsLabel"
                      defaultMessage="Leader patterns"
                    />
                  </EuiTitle>
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription>
                  {leaderIndexPatterns.join(', ')}
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  <EuiTitle size="xs">
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.prefixLabel"
                      defaultMessage="Prefix"
                    />
                  </EuiTitle>
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription>
                  {followIndexPatternPrefix || (
                    <em>
                      <FormattedMessage
                        id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.prefixEmptyValue"
                        defaultMessage="No prefix"
                      />
                    </em>
                  )}
                </EuiDescriptionListDescription>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  <EuiTitle size="xs">
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.suffixLabel"
                      defaultMessage="Suffix"
                    />
                  </EuiTitle>
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription>
                  {followIndexPatternSuffix || (
                    <em>
                      <FormattedMessage
                        id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.suffixEmptyValue"
                        defaultMessage="No suffix"
                      />
                    </em>
                  )}
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <AutoFollowPatternIndicesPreview
              prefix={followIndexPatternPrefix}
              suffix={followIndexPatternSuffix}
              leaderIndexPatterns={leaderIndexPatterns}
            />

            <EuiSpacer size="l" />

            <EuiLink
              href={indexManagementUri}
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.viewIndicesLink"
                defaultMessage="View your follower indices in Index Management"
              />
            </EuiLink>
          </EuiDescriptionList>
          <EuiSpacer size="l" />
          {this.renderAutoFollowPatternErrors()}
        </EuiFlyoutBody>
      </Fragment>
    );
  }

  renderAutoFollowPatternErrors() {
    const { autoFollowPattern } = this.props;

    if (!autoFollowPattern.errors.length) {
      return null;
    }

    return (
      <Fragment>
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.recentErrorsTitle"
                  defaultMessage="Recent errors"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText>
          <ul>
            {autoFollowPattern.errors.map((error, i) => (
              <li key={i}>{error.autoFollowException.reason}</li>
            ))}
          </ul>
        </EuiText>
      </Fragment>
    );
  }

  renderContent() {
    const {
      apiStatus,
      autoFollowPattern,
    } = this.props;

    if (apiStatus === API_STATUS.LOADING) {
      return (
        <EuiFlyoutBody>
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.loadingLabel"
                    defaultMessage="Loading auto-follow pattern..."
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    if (!autoFollowPattern) {
      return (
        <EuiFlyoutBody>
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type="alert" color="danger" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.notFoundLabel"
                    defaultMessage="Auto-follow pattern not found"
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    return this.renderAutoFollowPattern();
  }

  renderFooter() {
    const {
      autoFollowPattern,
      closeDetailPanel,
    } = this.props;

    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={closeDetailPanel}
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          {autoFollowPattern && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <AutoFollowPatternDeleteProvider>
                    {(deleteAutoFollowPattern) => (
                      <EuiButtonEmpty
                        color="danger"
                        onClick={() => deleteAutoFollowPattern(autoFollowPattern.name)}
                      >
                        <FormattedMessage
                          id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.deleteButtonLabel"
                          defaultMessage="Delete"
                        />
                      </EuiButtonEmpty>
                    )}
                  </AutoFollowPatternDeleteProvider>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="primary"
                    href={routing.getAutoFollowPatternPath(autoFollowPattern.name)}
                  >
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.editButtonLabel"
                      defaultMessage="Edit"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }

  render() {
    const { autoFollowPatternId, closeDetailPanel } = this.props;

    return (
      <EuiFlyout
        data-test-subj="autoFollowPatternDetailsFlyout"
        onClose={closeDetailPanel}
        aria-labelledby="autoFollowPatternDetailsFlyoutTitle"
        size="m"
        maxWidth={400}
      >

        <EuiFlyoutHeader>
          <EuiTitle size="m" id="autoFollowPatternDetailsFlyoutTitle">
            <h2>{autoFollowPatternId}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {this.renderContent()}
        {this.renderFooter()}
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
