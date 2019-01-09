/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import { connect } from 'react-redux';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiConfirmModal,
  EuiOverlayMask,
} from '@elastic/eui';

import { unfollowFollowerIndex } from '../store/actions';
import { arrify } from '../../../common/services/utils';

class Provider extends PureComponent {
  state = {
    isModalOpen: false,
    ids: null
  }

  onMouseOverModal = (event) => {
    // This component can sometimes be used inside of an EuiToolTip, in which case mousing over
    // the modal can trigger the tooltip. Stopping propagation prevents this.
    event.stopPropagation();
  };

  unfollowFollowerIndex = (id) => {
    this.setState({ isModalOpen: true, ids: arrify(id) });
  };

  onConfirm = () => {
    this.props.unfollowFollowerIndex(this.state.ids);
    this.setState({ isModalOpen: false, ids: null });
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
        id: 'xpack.crossClusterReplication.unfollowFollowerIndex.confirmModal.unfollowSingleTitle',
        defaultMessage: 'Unfollow leader index of follower index \'{name}\'?',
      }, { name: ids[0] })
      : intl.formatMessage({
        id: 'xpack.crossClusterReplication.unfollowFollowerIndex.confirmModal.unfollowMultipleTitle',
        defaultMessage: 'Unfollow leader indices of {count} follower indices?',
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
              id: 'xpack.crossClusterReplication.unfollowFollowerIndex.confirmModal.cancelButtonText',
              defaultMessage: 'Cancel',
            })
          }
          buttonColor="danger"
          confirmButtonText={
            intl.formatMessage({
              id: 'xpack.crossClusterReplication.unfollowFollowerIndex.confirmModal.confirmButtonText',
              defaultMessage: 'Unfollow',
            })
          }
          onMouseOver={this.onMouseOverModal}
        >
          {isSingle ? (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.unfollowFollowerIndex.confirmModal.singleUnfollowDescription"
                  defaultMessage="This follower index will be paused, closed, and converted into a regular index."
                />
              </p>
            </Fragment>
          ) : (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.unfollowFollowerIndex.confirmModal.multipleUnfollowDescription"
                  defaultMessage="These follower indices will be paused, closed, and converted into regular indices:"
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
        {children(this.unfollowFollowerIndex)}
        {isModalOpen && this.renderModal()}
      </Fragment>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  unfollowFollowerIndex: (id) => dispatch(unfollowFollowerIndex(id)),
});

export const FollowerIndexUnfollowProvider = connect(
  undefined,
  mapDispatchToProps
)(injectI18n(Provider));

