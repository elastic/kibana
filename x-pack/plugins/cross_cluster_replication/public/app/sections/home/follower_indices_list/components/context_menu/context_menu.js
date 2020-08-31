/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';

import { routing } from '../../../../../services/routing';
import {
  FollowerIndexPauseProvider,
  FollowerIndexResumeProvider,
  FollowerIndexUnfollowProvider,
} from '../../../../../components';

export class ContextMenu extends PureComponent {
  static propTypes = {
    iconSide: PropTypes.string,
    iconType: PropTypes.string,
    anchorPosition: PropTypes.string,
    label: PropTypes.node,
    followerIndices: PropTypes.array.isRequired,
  };

  state = {
    isPopoverOpen: false,
  };

  onButtonClick = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  editFollowerIndex = (id) => {
    const uri = routing.getFollowerIndexPath(id);
    routing.navigate(uri);
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
      testSubj,
    } = this.props;

    const button = (
      <EuiButton
        data-test-subj={testSubj}
        iconSide={iconSide}
        onClick={this.onButtonClick}
        iconType={iconType}
        fill
      >
        {label}
      </EuiButton>
    );

    const pausedFollowerIndexNames = followerIndices
      .filter(({ isPaused }) => isPaused)
      .map((index) => index.name);
    const activeFollowerIndices = followerIndices.filter(({ isPaused }) => !isPaused);

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
        <EuiContextMenuPanel data-test-subj="contextMenu">
          {activeFollowerIndices.length ? (
            <FollowerIndexPauseProvider onConfirm={this.closePopover}>
              {(pauseFollowerIndex) => (
                <EuiContextMenuItem
                  icon="pause"
                  onClick={() => pauseFollowerIndex(activeFollowerIndices)}
                  data-test-subj="pauseButton"
                >
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndex.contextMenu.pauseLabel"
                    defaultMessage="Pause replication"
                  />
                </EuiContextMenuItem>
              )}
            </FollowerIndexPauseProvider>
          ) : null}

          {pausedFollowerIndexNames.length ? (
            <FollowerIndexResumeProvider onConfirm={this.closePopover}>
              {(resumeFollowerIndex) => (
                <EuiContextMenuItem
                  icon="play"
                  onClick={() => resumeFollowerIndex(pausedFollowerIndexNames)}
                  data-test-subj="resumeButton"
                >
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndex.contextMenu.resumeLabel"
                    defaultMessage="Resume replication"
                  />
                </EuiContextMenuItem>
              )}
            </FollowerIndexResumeProvider>
          ) : null}

          {followerIndexNames.length === 1 && (
            <Fragment>
              <EuiContextMenuItem
                icon="pencil"
                onClick={() => this.editFollowerIndex(followerIndexNames[0])}
                data-test-subj="editButton"
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndex.contextMenu.editLabel"
                  data-test-subj="editButton"
                  defaultMessage="Edit follower index"
                />
              </EuiContextMenuItem>
            </Fragment>
          )}

          <FollowerIndexUnfollowProvider onConfirm={this.closePopover}>
            {(unfollowLeaderIndex) => (
              <EuiContextMenuItem
                icon="indexFlush"
                onClick={() => unfollowLeaderIndex(followerIndexNames)}
                data-test-subj="unfollowButton"
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
