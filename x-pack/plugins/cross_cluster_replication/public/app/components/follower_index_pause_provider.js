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

import { pauseFollowerIndex } from '../store/actions';
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

  pauseFollowerIndex = (id) => {
    this.setState({ isModalOpen: true, ids: arrify(id) });
  };

  onConfirm = () => {
    this.props.pauseFollowerIndex(this.state.ids);
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
        id: 'xpack.crossClusterReplication.pauseFollowerIndex.confirmModal.pauseSingleTitle',
        defaultMessage: 'Pause follower index \'{name}\'?',
      }, { name: ids[0] })
      : intl.formatMessage({
        id: 'xpack.crossClusterReplication.pauseFollowerIndex.confirmModal.pauseMultipleTitle',
        defaultMessage: 'Pause {count} follower indices?',
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
              id: 'xpack.crossClusterReplication.pauseFollowerIndex.confirmModal.cancelButtonText',
              defaultMessage: 'Cancel',
            })
          }
          buttonColor="primary"
          confirmButtonText={
            intl.formatMessage({
              id: 'xpack.crossClusterReplication.pauseFollowerIndex.confirmModal.confirmButtonText',
              defaultMessage: 'Pause',
            })
          }
          onMouseOver={this.onMouseOverModal}
        >
          {!isSingle && (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.pauseFollowerIndex.confirmModal.multiplePauseDescription"
                  defaultMessage="These follower indices will be paused:"
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
        {children(this.pauseFollowerIndex)}
        {isModalOpen && this.renderModal()}
      </Fragment>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  pauseFollowerIndex: (id) => dispatch(pauseFollowerIndex(id)),
});

export const FollowerIndexPauseProvider = connect(
  undefined,
  mapDispatchToProps
)(injectI18n(Provider));

