/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import { toastNotifications } from 'ui/notify';
import { Space } from '../../../../common/model/space';
import { SpacesManager } from '../../../lib/spaces_manager';
import { ConfirmDeleteModal } from './confirm_delete_modal';
import { ConfirmRedirectModal } from './confirm_redirect_modal';

interface Props {
  spaces: Space[];
  spacesManager: SpacesManager;
  spacesNavState: any;
  onDelete: () => void;
}

interface State {
  showConfirmDeleteModal: boolean;
  showConfirmRedirectModal: boolean;
}

export class DeleteSpacesButton extends Component<Props, State> {
  public state = {
    showConfirmDeleteModal: false,
    showConfirmRedirectModal: false,
  };

  public render() {
    const numSpaces = this.props.spaces.length;

    const buttonText = numSpaces > 1 ? `Delete ${numSpaces} spaces` : `Delete space`;

    return (
      <Fragment>
        <EuiButton color={'danger'} onClick={this.onDeleteClick}>
          {buttonText}
        </EuiButton>
        {this.getConfirmDeleteModal()}
        {this.getConfirmRedirectModal()}
      </Fragment>
    );
  }

  public onDeleteClick = () => {
    this.setState({
      showConfirmDeleteModal: true,
    });
  };

  public getConfirmDeleteModal = () => {
    if (!this.state.showConfirmDeleteModal) {
      return null;
    }

    const { spaces, spacesNavState } = this.props;

    const isDeletingCurrentSpace = !!this.locateCurrentSpace();

    const performDelete = () => {
      this.deleteSpaces(() => {
        this.setState({
          showConfirmDeleteModal: false,
        });

        const message =
          spaces.length > 1
            ? `Deleted ${spaces.length} spaces.`
            : `Deleted "${spaces[0].name}" space.`;

        toastNotifications.addSuccess(message);

        if (this.props.onDelete) {
          this.props.onDelete();
        }

        spacesNavState.refreshSpacesList();
      });
    };

    const nextStep = isDeletingCurrentSpace ? this.showConfirmRedirectModal : performDelete;

    return (
      <ConfirmDeleteModal
        spaces={this.props.spaces}
        onCancel={() => {
          this.setState({
            showConfirmDeleteModal: false,
          });
        }}
        onConfirm={nextStep}
      />
    );
  };

  public showConfirmRedirectModal = () => {
    this.setState({
      showConfirmDeleteModal: false,
      showConfirmRedirectModal: true,
    });
  };

  public getConfirmRedirectModal = () => {
    if (!this.state.showConfirmRedirectModal) {
      return null;
    }

    const performDelete = () => {
      this.deleteSpaces(() => {
        this.props.spacesManager.redirectToSpaceSelector();
      });
    };

    return (
      <ConfirmRedirectModal
        space={this.locateCurrentSpace()}
        onCancel={() => {
          this.setState({
            showConfirmRedirectModal: false,
          });
        }}
        onConfirm={performDelete}
      />
    );
  };

  public deleteSpaces = (onComplete: () => void) => {
    const { spacesManager, spaces } = this.props;

    const deleteOperations = spaces.map(space => spacesManager.deleteSpace(space));

    Promise.all(deleteOperations)
      .then(onComplete)
      .catch(error => {
        const { message = '' } = error.data || {};

        toastNotifications.addDanger(`Error deleting space: ${message}`);
      });
  };

  private locateCurrentSpace = () => {
    return this.props.spaces.find(
      space => space.id === this.props.spacesNavState.getActiveSpace().id
    );
  };
}
