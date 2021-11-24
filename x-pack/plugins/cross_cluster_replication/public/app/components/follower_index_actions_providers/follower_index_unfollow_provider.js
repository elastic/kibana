/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal } from '@elastic/eui';

import { unfollowLeaderIndex } from '../../store/actions';
import { arrify } from '../../../../common/services/utils';

class FollowerIndexUnfollowProviderUi extends PureComponent {
  static propTypes = {
    onConfirm: PropTypes.func,
  };

  state = {
    isModalOpen: false,
    ids: null,
  };

  onMouseOverModal = (event) => {
    // This component can sometimes be used inside of an EuiToolTip, in which case mousing over
    // the modal can trigger the tooltip. Stopping propagation prevents this.
    event.stopPropagation();
  };

  unfollowLeaderIndex = (id) => {
    this.setState({ isModalOpen: true, ids: arrify(id) });
  };

  onConfirm = () => {
    this.props.unfollowLeaderIndex(this.state.ids);
    this.setState({ isModalOpen: false, ids: null });
    this.props.onConfirm && this.props.onConfirm();
  };

  closeConfirmModal = () => {
    this.setState({
      isModalOpen: false,
    });
  };

  renderModal = () => {
    const { ids } = this.state;
    const isSingle = ids.length === 1;
    const title = isSingle
      ? i18n.translate(
          'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.unfollowSingleTitle',
          {
            defaultMessage: `Unfollow leader index of '{name}'?`,
            values: { name: ids[0] },
          }
        )
      : i18n.translate(
          'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.unfollowMultipleTitle',
          {
            defaultMessage: `Unfollow {count} leader indices?`,
            values: { count: ids.length },
          }
        );

    return (
      // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events
      <EuiConfirmModal
        title={title}
        onCancel={this.closeConfirmModal}
        onConfirm={this.onConfirm}
        cancelButtonText={i18n.translate(
          'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.cancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        buttonColor="danger"
        confirmButtonText={i18n.translate(
          'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.confirmButtonText',
          {
            defaultMessage: 'Unfollow leader',
          }
        )}
        onMouseOver={this.onMouseOverModal}
        data-test-subj="unfollowLeaderConfirmation"
      >
        {isSingle ? (
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.singleUnfollowDescription"
                defaultMessage="The follower index will be converted to a standard index. It will
                    no longer appear in Cross-Cluster Replication, but you can manage it in Index
                    Management. You can't undo this operation."
              />
            </p>
          </Fragment>
        ) : (
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.multipleUnfollowDescription"
                defaultMessage="The follower indices will be converted to standard indices. They
                    will no longer appear in Cross-Cluster Replication, but you can manage them in
                    Index Management. You can't undo this operation."
              />
            </p>
            <ul>
              {ids.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </Fragment>
        )}
      </EuiConfirmModal>
    );
  };

  render() {
    const { children } = this.props;
    const { isModalOpen } = this.state;

    return (
      <Fragment>
        {children(this.unfollowLeaderIndex)}
        {isModalOpen && this.renderModal()}
      </Fragment>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  unfollowLeaderIndex: (id) => dispatch(unfollowLeaderIndex(id)),
});

export const FollowerIndexUnfollowProvider = connect(
  undefined,
  mapDispatchToProps
)(FollowerIndexUnfollowProviderUi);
