/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';

import {
  FollowerIndexPauseProvider,
  FollowerIndexResumeProvider,
  FollowerIndexUnfollowProvider
} from '../../../../../components';

import {
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';

export class ContextMenuUi extends Component {

  static propTypes = {
    iconSide: PropTypes.string,
    iconType: PropTypes.string,
    anchorPosition: PropTypes.string,
    label: PropTypes.node,
    followerIndices: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false
    });
  };

  render() {
    const { followerIndices } = this.props;
    const followerIndicesLength = followerIndices.length;
    const followerIndexNames = followerIndices.map((index) => index.name);
    const {
      iconSide = 'right',
      iconType = 'arrowDown',
      anchorPosition = 'rightUp',
      label = (
        <FormattedMessage
          id="xpack.crossClusterReplication.followerIndex.contextMenu.buttonLabel"
          defaultMessage="Manage follower {followerIndicesLength, plural, one {index} other {indices}}"
          values={{ followerIndicesLength }}
        />
      ),
    } = this.props;


    const button = (
      <EuiButton
        data-test-subj="followerIndexContextMenuButton"
        iconSide={iconSide}
        // aria-label={`${entity} options`}
        onClick={this.onButtonClick}
        iconType={iconType}
        fill
      >
        {label}
      </EuiButton>
    );

    // TODO: Fix with correct logic when paused status info is available from ES, currently all
    // follower indices are assumed to be active: https://github.com/elastic/elasticsearch/issues/37127
    const pausedFollowerIndexNames = followerIndices.filter(({ shards }) => !shards || !shards.length).map((index) => index.name);
    const activeFollowerIndexNames = followerIndices.filter(({ shards }) => shards && shards.length).map((index) => index.name);

    return (
      <EuiPopover
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition={anchorPosition}
        repositionOnScroll
      >
        <EuiPopoverTitle>
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndex.contextMenu.title"
            defaultMessage="Follower {followerIndicesLength, plural, one {index} other {indices}} options"
            values={{ followerIndicesLength }}
          />
        </EuiPopoverTitle>
        <EuiContextMenuPanel>

          {
            activeFollowerIndexNames ? (
              <FollowerIndexPauseProvider>
                {(pauseFollowerIndex) => (
                  <EuiContextMenuItem
                    icon="pause"
                    onClick={() => pauseFollowerIndex(activeFollowerIndexNames)}
                  >
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndex.contextMenu.pauseLabel"
                      defaultMessage="Pause follower {activeFollowerIndicesLength, plural, one {index} other {indices}}"
                      values={{ activeFollowerIndicesLength: activeFollowerIndexNames.length }}
                    />
                  </EuiContextMenuItem>
                )}
              </FollowerIndexPauseProvider>
            ) : null
          }

          {
            pausedFollowerIndexNames.length ? (
              <FollowerIndexResumeProvider>
                {(resumeFollowerIndex) => (
                  <EuiContextMenuItem
                    icon="play"
                    onClick={() => resumeFollowerIndex(pausedFollowerIndexNames)}
                  >
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndex.contextMenu.resumeLabel"
                      defaultMessage="Resume follower {pausedFollowerIndicesLength, plural, one {index} other {indices}}"
                      values={{ pausedFollowerIndicesLength: pausedFollowerIndexNames.length }}
                    />
                  </EuiContextMenuItem>
                )}
              </FollowerIndexResumeProvider>
            ) : null
          }

          <FollowerIndexUnfollowProvider>
            {(unfollowFollowerIndex) => (
              <EuiContextMenuItem
                icon="indexFlush"
                onClick={() => unfollowFollowerIndex(followerIndexNames)}
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndex.contextMenu.unfollowLabel"
                  defaultMessage="Unfollow leader {followerIndicesLength, plural, one {index} other {indices}}"
                  values={{ followerIndicesLength }}
                />
              </EuiContextMenuItem>
            )}
          </FollowerIndexUnfollowProvider>
        </EuiContextMenuPanel>
      </EuiPopover>
    );
  }
}

export const ContextMenu = injectI18n(ContextMenuUi);
