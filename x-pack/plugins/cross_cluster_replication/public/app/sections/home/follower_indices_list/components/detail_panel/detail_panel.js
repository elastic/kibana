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
  EuiButtonEmpty,
  EuiCodeEditor,
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

import 'brace/theme/textmate';

import { ContextMenu } from '../context_menu';

import { API_STATUS } from '../../../../../constants';
// import routing from '../../../../../services/routing';

export class DetailPanelUi extends Component {
  static propTypes = {
    apiStatus: PropTypes.string,
    followerIndexId: PropTypes.string,
    followerIndex: PropTypes.object,
    closeDetailPanel: PropTypes.func.isRequired,
  }

  renderFollowerIndex() {
    const {
      followerIndex: {
        name,
        remoteCluster,
        leaderIndex,
        shards,
      },
    } = this.props;

    const indexManagementUri = getIndexListUri(`name:${name}`);

    return (
      <Fragment>
        <EuiFlyoutBody>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexDetailPanel.statusTitle"
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
                      id="xpack.crossClusterReplication.followerIndexDetailPanel.remoteClusterLabel"
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
                      id="xpack.crossClusterReplication.followerIndexDetailPanel.leaderIndexLabel"
                      defaultMessage="Leader index"
                    />
                  </EuiTitle>
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription>
                  {leaderIndex}
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="l" />

            <EuiLink
              href={indexManagementUri}
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexDetailPanel.viewIndexLink"
                defaultMessage="View your follower index in Index Management"
              />
            </EuiLink>

            {shards.map((shard, i) => (
              <Fragment key={i}>
                <EuiSpacer size="m" />
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndexDetailPanel.shardStatsTitle"
                      defaultMessage="Shard {id} stats"
                      values={{
                        id: shard.id
                      }}
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiCodeEditor
                  mode="json"
                  theme="textmate"
                  width="100%"
                  isReadOnly
                  setOptions={{ maxLines: Infinity }}
                  value={JSON.stringify(shard, null, 2)}
                  editorProps={{
                    $blockScrolling: Infinity
                  }}
                />
              </Fragment>
            ))}
          </EuiDescriptionList>
        </EuiFlyoutBody>
      </Fragment>
    );
  }

  renderContent() {
    const {
      apiStatus,
      followerIndex,
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
                    id="xpack.crossClusterReplication.followerIndexDetailPanel.loadingLabel"
                    defaultMessage="Loading follower index..."
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    if (!followerIndex) {
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
                    id="xpack.crossClusterReplication.followerIndexDetailPanel.notFoundLabel"
                    defaultMessage="Follower index not found"
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    return this.renderFollowerIndex();
  }

  renderFooter() {
    const {
      followerIndex,
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
                id="xpack.crossClusterReplication.followerIndexDetailPanel.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          {followerIndex && (
            <EuiFlexItem grow={false}>
              <ContextMenu
                iconSide="left"
                iconType="arrowUp"
                anchorPosition="upRight"
                label={(
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexDetailPanel.manageButtonLabel"
                    defaultMessage="Manage"
                  />
                )}
                followerIndices={[followerIndex]}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }

  render() {
    const { followerIndexId, closeDetailPanel } = this.props;

    return (
      <EuiFlyout
        data-test-subj="followerIndexDetailsFlyout"
        onClose={closeDetailPanel}
        aria-labelledby="followerIndexDetailsFlyoutTitle"
        size="m"
        maxWidth={400}
      >

        <EuiFlyoutHeader>
          <EuiTitle size="m" id="followerIndexDetailsFlyoutTitle">
            <h2>{followerIndexId}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {this.renderContent()}
        {this.renderFooter()}
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
