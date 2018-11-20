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
<<<<<<< HEAD
=======
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======
  intl: InjectedIntl;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}

interface State {
  confirmSpaceName: string;
  error: boolean | null;
  deleteInProgress: boolean;
}

<<<<<<< HEAD
export class ConfirmDeleteModal extends Component<Props, State> {
=======
class ConfirmDeleteModalUI extends Component<Props, State> {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  public state = {
    confirmSpaceName: '',
    error: null,
    deleteInProgress: false,
  };

  public render() {
<<<<<<< HEAD
    const { space, spacesNavState, onCancel } = this.props;
=======
    const { space, spacesNavState, onCancel, intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

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
<<<<<<< HEAD
            You are about to delete your current space {name}. You will be redirected to choose a
            different space if you continue.
=======
            <FormattedMessage
              id="xpack.spaces.management.confirmDeleteModal.redirectAfterDeletingCurrentSpaceWarningMessage"
              defaultMessage="You are about to delete your current space {name}. You will be redirected to choose a different space if you continue."
              values={{ name }}
            />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          </EuiText>
        </EuiCallOut>
      );
    }

    // This is largely the same as the built-in EuiConfirmModal component, but we needed the ability
    // to disable the buttons since this could be a long-running operation

    return (
      <EuiOverlayMask>
        <EuiModal onClose={onCancel} className={'spcConfirmDeleteModal'}>
          <EuiModalHeader>
            <EuiModalHeaderTitle data-test-subj="confirmModalTitleText">
<<<<<<< HEAD
              Delete space {`'${space.name}'`}
=======
              <FormattedMessage
                id="xpack.spaces.management.confirmDeleteModal.confirmDeleteSpaceButtonLabel"
                defaultMessage="Delete space {spaceName}"
                values={{
                  spaceName: "'" + space.name + "'",
                }}
              />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText data-test-subj="confirmModalBodyText">
              <p>
<<<<<<< HEAD
                Deleting a space permanently removes the space and{' '}
                <strong>all of its contents</strong>. You can't undo this action.
              </p>

              <EuiFormRow
                label={'Confirm space name'}
                isInvalid={!!this.state.error}
                error={'Space names do not match.'}
=======
                <FormattedMessage
                  id="xpack.spaces.management.confirmDeleteModal.deletingSpaceWarningMessage"
                  defaultMessage="Deleting a space permanently removes the space and {allContents}. You can't undo this action."
                  values={{
                    allContents: (
                      <strong>
                        <FormattedMessage
                          id="xpack.spaces.management.confirmDeleteModal.allContentsText"
                          defaultMessage="all of its contents"
                        />
                      </strong>
                    ),
                  }}
                />
              </p>

              <EuiFormRow
                label={intl.formatMessage({
                  id: 'xpack.spaces.management.confirmDeleteModal.confirmSpaceNameFormRowLabel',
                  defaultMessage: 'Confirm space name',
                })}
                isInvalid={!!this.state.error}
                error={intl.formatMessage({
                  id: 'xpack.spaces.management.confirmDeleteModal.spaceNamesDoNoMatchErrorMessage',
                  defaultMessage: 'Space names do not match.',
                })}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
              Cancel
=======
              <FormattedMessage
                id="xpack.spaces.management.confirmDeleteModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            </EuiButtonEmpty>

            <EuiButton
              data-test-subj="confirmModalConfirmButton"
              onClick={this.onConfirm}
              fill
              color={'danger'}
              isLoading={this.state.deleteInProgress}
            >
<<<<<<< HEAD
              Delete space and all contents
=======
              <FormattedMessage
                id="xpack.spaces.management.confirmDeleteModal.deleteSpaceAndAllContentsButtonLabel"
                defaultMessage=" Delete space and all contents"
              />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======

export const ConfirmDeleteModal = injectI18n(ConfirmDeleteModalUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
