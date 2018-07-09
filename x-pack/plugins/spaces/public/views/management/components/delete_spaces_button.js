/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { ConfirmDeleteModal } from './confirm_delete_modal';
import {
  EuiButton
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';

export class DeleteSpacesButton extends Component {
  state = {
    showConfirmModal: false
  };

  render() {
    const numSpaces = this.props.spaces.length;

    const buttonText = numSpaces > 1
      ? `Delete ${numSpaces} spaces`
      : `Delete space`;

    return (
      <Fragment>
        <EuiButton color={'danger'} onClick={this.onDeleteClick}>
          {buttonText}
        </EuiButton>
        {this.getConfirmDeleteModal()}
      </Fragment>
    );
  }

  onDeleteClick = () => {
    this.setState({
      showConfirmModal: true
    });
  };

  getConfirmDeleteModal = () => {
    if (!this.state.showConfirmModal) {
      return null;
    }

    return (
      <ConfirmDeleteModal
        spaces={this.props.spaces}
        onCancel={() => {
          this.setState({
            showConfirmModal: false
          });
        }}
        onConfirm={this.deleteSpaces}
      />
    );
  };

  deleteSpaces = () => {
    const {
      spacesManager,
      spaces,
      spacesNavState,
    } = this.props;

    const deleteOperations = spaces.map(space => spacesManager.deleteSpace(space));

    Promise.all(deleteOperations)
      .then(() => {
        this.setState({
          showConfirmModal: false
        });

        const message = spaces.length > 1
          ? `Deleted ${spaces.length} spaces.`
          : `Deleted "${spaces[0].name}" space.`;

        toastNotifications.addSuccess(message);

        if (this.props.onDelete) {
          this.props.onDelete();
        }

        spacesNavState.refreshSpacesList();

      })
      .catch(error => {
        const {
          message = ''
        } = error.data || {};

        toastNotifications.addDanger(`Error deleting space: ${message}`);
      });
  };
}

DeleteSpacesButton.propTypes = {
  spaces: PropTypes.array.isRequired,
  spacesManager: PropTypes.object.isRequired,
  spacesNavState: PropTypes.object.isRequired,
  onDelete: PropTypes.func
};
