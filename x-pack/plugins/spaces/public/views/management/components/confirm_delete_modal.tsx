/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCallOut,
  // @ts-ignore
  EuiConfirmModal,
  EuiFieldText,
  EuiFormRow,
  EuiOverlayMask,
  EuiText,
} from '@elastic/eui';
import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import React, { ChangeEvent, Component } from 'react';
import { Space } from '../../../../common/model/space';
import { SpacesManager } from '../../../lib';

interface Props {
  space: Space;
  spacesManager: SpacesManager;
  spacesNavState: SpacesNavState;
  onCancel: () => void;
  onConfirm: () => void;
}

interface State {
  confirmSpaceName: string;
  error: boolean | null;
}

export class ConfirmDeleteModal extends Component<Props, State> {
  public state = {
    confirmSpaceName: '',
    error: null,
  };

  public render() {
    const { space, spacesNavState, onCancel } = this.props;

    let warning = null;
    if (isDeletingCurrentSpace(space, spacesNavState)) {
      const name = (
        <span>
          (<strong>{space.name}</strong>)
        </span>
      );
      warning = (
        <EuiCallOut color="warning">
          <EuiText>
            You are about to delete your current space {name}. You will be redirected to choose a
            different space if you continue.
          </EuiText>
        </EuiCallOut>
      );
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          buttonColor={'danger'}
          cancelButtonText={'Cancel'}
          confirmButtonText={'Delete space'}
          onCancel={onCancel}
          onConfirm={this.onConfirm}
          title={`Delete space '${space.name}'`}
          defaultFocusedButton={'cancel'}
        >
          <p>
            Deleting a space permanently removes the space and all of its contents. You can't undo
            this action.
          </p>

          <EuiFormRow
            label={'Confirm space name'}
            isInvalid={!!this.state.error}
            error={'Space names do not match.'}
          >
            <EuiFieldText value={this.state.confirmSpaceName} onChange={this.onSpaceNameChange} />
          </EuiFormRow>

          {warning}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  private onSpaceNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (typeof this.state.error === 'boolean') {
      this.setState({
        confirmSpaceName: e.target.value,
        error: e.target.value !== this.props.space.name,
      });
    } else {
      this.setState({
        confirmSpaceName: e.target.value,
      });
    }
  };

  private onConfirm = async () => {
    if (this.state.confirmSpaceName === this.props.space.name) {
      const needsRedirect = isDeletingCurrentSpace(this.props.space, this.props.spacesNavState);
      const spacesManager = this.props.spacesManager;

      await this.props.onConfirm();
      if (needsRedirect) {
        spacesManager.redirectToSpaceSelector();
      }
    } else {
      this.setState({
        error: true,
      });
    }
  };
}

function isDeletingCurrentSpace(space: Space, spacesNavState: SpacesNavState) {
  return space.id === spacesNavState.getActiveSpace().id;
}
