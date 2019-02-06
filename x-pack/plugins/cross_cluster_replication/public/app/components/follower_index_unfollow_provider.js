/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiConfirmModal,
  EuiOverlayMask,
} from '@elastic/eui';

import { unfollowLeaderIndex } from '../store/actions';
import { arrify } from '../../../common/services/utils';

class Provider extends PureComponent {
  static propTypes = {
    onConfirm: PropTypes.func,
  }

  state = {
    isModalOpen: false,
    ids: null
  }

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
  }

  closeConfirmModal = () => {
    this.setState({
      isModalOpen: false,
    });
  };

  renderModal = () => {
    const { intl } = this.props;
    const { ids } = this.state;
    const isSingle = ids.length === 1;
    const title = isSingle
      ? intl.formatMessage({
        id: 'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.unfollowSingleTitle',
        defaultMessage: `Unfollow leader index of '{name}'?`,
      }, { name: ids[0] })
      : intl.formatMessage({
        id: 'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.unfollowMultipleTitle',
        defaultMessage: 'Unfollow {count} leader indices?',
      }, { count: ids.length });

    return (
      <EuiOverlayMask>
        { /* eslint-disable-next-line jsx-a11y/mouse-events-have-key-events */ }
        <EuiConfirmModal
          title={title}
          onCancel={this.closeConfirmModal}
          onConfirm={this.onConfirm}
          cancelButtonText={
            intl.formatMessage({
              id: 'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.cancelButtonText',
              defaultMessage: 'Cancel',
            })
          }
          buttonColor="danger"
          confirmButtonText={
            intl.formatMessage({
              id: 'xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.confirmButtonText',
              defaultMessage: 'Unfollow leader',
            })
          }
          onMouseOver={this.onMouseOverModal}
        >
          {isSingle ? (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.unfollowLeaderIndex.confirmModal.singleUnfollowDescription"
                  defaultMessage="The follower index will be converted to a standard index. It will
                    no longer appear in Cross Cluster Replication, but you can manage it in Index
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
                    will no longer appear in Cross Cluster Replication, but you can manage them in
                    Index Management. You can't undo this operation."
                />
              </p>
              <ul>{ids.map(id => <li key={id}>{id}</li>)}</ul>
            </Fragment>
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

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
)(injectI18n(Provider));

