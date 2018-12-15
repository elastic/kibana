/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
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
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import {
  FollowerIndicesPreview,
  AutoFollowPatternDeleteProvider,
} from '../../../../../components';

import { getPrefixSuffixFromFollowPattern } from '../../../../../services/auto_follow_pattern';
import routing from '../../../../../services/routing';

export class DetailPanelUi extends Component {
  static propTypes = {
    isDetailPanelOpen: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool,
    autoFollowPattern: PropTypes.object,
    autoFollowPatternName: PropTypes.string,
    closeDetailPanel: PropTypes.func.isRequired,
    editAutoFollowPattern: PropTypes.func.isRequired,
  }

  renderAutoFollowPattern() {
    const {
      autoFollowPattern: {
        followIndexPattern,
        remoteCluster,
        leaderIndexPatterns,
      },
    } = this.props;

    const {
      followIndexPatternPrefix,
      followIndexPatternSuffix,
    } = getPrefixSuffixFromFollowPattern(followIndexPattern);

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
                  {followIndexPatternPrefix}
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
                  {followIndexPatternSuffix}
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <FollowerIndicesPreview
              prefix={followIndexPatternPrefix}
              suffix={followIndexPatternSuffix}
              leaderIndexPatterns={leaderIndexPatterns}
            />
          </EuiDescriptionList>
        </EuiFlyoutBody>
      </Fragment>
    );
  }

  renderContent() {
    const {
      isLoading,
      autoFollowPattern,
    } = this.props;

    if (isLoading) {
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
      editAutoFollowPattern,
      autoFollowPattern,
      autoFollowPatternName,
    } = this.props;

    if (!autoFollowPattern) {
      return null;
    }

    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <AutoFollowPatternDeleteProvider>
              {(deleteAutoFollowPattern) => (
                <EuiButton
                  iconType="trash"
                  color="danger"
                  onClick={() => deleteAutoFollowPattern(autoFollowPatternName)}
                >
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.deleteButtonLabel"
                    defaultMessage="Delete"
                  />
                </EuiButton>
              )}
            </AutoFollowPatternDeleteProvider>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              onClick={() => {
                editAutoFollowPattern(autoFollowPatternName);
                routing.navigate(encodeURI(`/auto_follow_patterns/edit/${encodeURIComponent(autoFollowPatternName)}`));
              }}
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternDetailPanel.editButtonLabel"
                defaultMessage="Edit"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }

  render() {
    const {
      isDetailPanelOpen,
      closeDetailPanel,
      autoFollowPatternName,
    } = this.props;

    if (!isDetailPanelOpen) {
      return null;
    }

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
            <h2>{autoFollowPatternName}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {this.renderContent()}

        {this.renderFooter()}
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
