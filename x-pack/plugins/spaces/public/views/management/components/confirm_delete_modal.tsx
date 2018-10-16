/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  // @ts-ignore
  EuiConfirmModal,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
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
  deleteInProgress: boolean;
}

export class ConfirmDeleteModal extends Component<Props, State> {
  public state = {
    confirmSpaceName: '',
    error: null,
    deleteInProgress: false,
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

    // This is largely the same as the built-in EuiConfirmModal component, but we needed the ability
    // to disable the buttons since this could be a long-running operation

    return (
      <EuiOverlayMask>
        <EuiModal onClose={onCancel} className={'euiModal--confirmation'}>
          <EuiModalHeader>
            <EuiModalHeaderTitle data-test-subj="confirmModalTitleText">
              Delete space {`'${space.name}'`}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText data-test-subj="confirmModalBodyText">
              <p>
                Deleting a space permanently removes the space and{' '}
                <strong>all of its contents</strong>. You can't undo this action.
              </p>

              <EuiFormRow
                label={'Confirm space name'}
                isInvalid={!!this.state.error}
                error={'Space names do not match.'}
              >
                <EuiFieldText
                  value={this.state.confirmSpaceName}
                  onChange={this.onSpaceNameChange}
                  disabled={this.state.deleteInProgress}
                />
              </EuiFormRow>

              {warning}
            </EuiText>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="confirmModalCancelButton"
              onClick={onCancel}
              isDisabled={this.state.deleteInProgress}
            >
              Cancel
            </EuiButtonEmpty>

            <EuiButton
              data-test-subj="confirmModalConfirmButton"
              onClick={this.onConfirm}
              fill
              color={'danger'}
              isLoading={this.state.deleteInProgress}
            >
              Delete space and all contents
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
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

      this.setState({
        deleteInProgress: true,
      });

      await this.props.onConfirm();

      this.setState({
        deleteInProgress: false,
      });

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
