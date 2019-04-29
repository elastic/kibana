/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { PureComponent, Fragment } from 'react';
import { connect } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiConfirmModal,
  EuiOverlayMask,
} from '@elastic/eui';

import { deleteAutoFollowPattern } from '../store/actions';
import { arrify } from '../../../common/services/utils';

class AutoFollowPatternDeleteProviderUi extends PureComponent {
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
    const { ids } = this.state;
    const isSingle = ids.length === 1;
    const title = isSingle
      ? i18n.translate(
        'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.deleteSingleTitle',
        {
          defaultMessage: `Remove auto-follow pattern '{name}'?`,
          values: { name: ids[0] }
        }
      ) : i18n.translate(
        'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.deleteMultipleTitle',
        {
          defaultMessage: `Remove {count} auto-follow patterns?`,
          values: { count: ids.length }
        }
      );

    return (
      <EuiOverlayMask>
        { /* eslint-disable-next-line jsx-a11y/mouse-events-have-key-events */ }
        <EuiConfirmModal
          title={title}
          onCancel={this.closeConfirmModal}
          onConfirm={this.onConfirm}
          cancelButtonText={
            i18n.translate(
              'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.cancelButtonText',
              {
                defaultMessage: 'Cancel'
              }
            )
          }
          buttonColor="danger"
          confirmButtonText={
            i18n.translate(
              'xpack.crossClusterReplication.deleteAutoFollowPattern.confirmModal.confirmButtonText',
              {
                defaultMessage: 'Remove'
              }
            )
          }
          onMouseOver={this.onMouseOverModal}
          data-test-subj="deleteAutoFollowPatternConfirmation"
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
)(AutoFollowPatternDeleteProviderUi);

