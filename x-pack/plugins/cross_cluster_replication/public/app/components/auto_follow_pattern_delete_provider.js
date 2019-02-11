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

import { deleteAutoFollowPattern } from '../store/actions';
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

  deleteAutoFollowPattern = (id) => {
    this.setState({ isModalOpen: true, ids: arrify(id) });
  };

  onConfirm = () => {
    this.props.deleteAutoFollowPattern(this.state.ids);
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
        id: 'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.deleteSingleTitle',
        defaultMessage: 'Remove auto-follow pattern \'{name}\'?',
      }, { name: ids[0] })
      : intl.formatMessage({
        id: 'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.deleteMultipleTitle',
        defaultMessage: 'Remove {count} auto-follow patterns?',
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
              id: 'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.cancelButtonText',
              defaultMessage: 'Cancel',
            })
          }
          buttonColor="danger"
          confirmButtonText={
            intl.formatMessage({
              id: 'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.confirmButtonText',
              defaultMessage: 'Remove',
            })
          }
          onMouseOver={this.onMouseOverModal}
        >
          {!isSingle && (
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.multipleDeletionDescription"
                  defaultMessage="You are about to remove these auto-follow patterns:"
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
        {children(this.deleteAutoFollowPattern)}
        {isModalOpen && this.renderModal()}
      </Fragment>
    );
  }
}

const mapDispatchToProps = dispatch => ({
  deleteAutoFollowPattern: (id) => dispatch(deleteAutoFollowPattern(id)),
});

export const AutoFollowPatternDeleteProvider = connect(
  undefined,
  mapDispatchToProps
)(injectI18n(Provider));

