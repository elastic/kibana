/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import React, { Component, Fragment } from 'react';
// @ts-ignore
import { toastNotifications } from 'ui/notify';
import { Space } from '../../../../common/model/space';
import { SpacesManager } from '../../../lib/spaces_manager';
import { ConfirmDeleteModal } from '../components/confirm_delete_modal';

interface Props {
  style?: 'button' | 'icon';
  space: Space;
  spacesManager: SpacesManager;
  spacesNavState: SpacesNavState;
  onDelete: () => void;
<<<<<<< HEAD
=======
  intl: InjectedIntl;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}

interface State {
  showConfirmDeleteModal: boolean;
  showConfirmRedirectModal: boolean;
}

<<<<<<< HEAD
export class DeleteSpacesButton extends Component<Props, State> {
=======
class DeleteSpacesButtonUI extends Component<Props, State> {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  public state = {
    showConfirmDeleteModal: false,
    showConfirmRedirectModal: false,
  };

  public render() {
<<<<<<< HEAD
    const buttonText = `Delete space`;
=======
    const buttonText = (
      <FormattedMessage
        id="xpack.spaces.management.deleteSpacesButton.deleteSpaceButtonLabel"
        defaultMessage="Delete space"
      />
    );
    const { intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

    let ButtonComponent: any = EuiButton;

    const extraProps: EuiButtonIconProps = {};

    if (this.props.style === 'icon') {
      ButtonComponent = EuiButtonIcon;
      extraProps.iconType = 'trash';
    }

    return (
      <Fragment>
        <ButtonComponent
          color={'danger'}
          onClick={this.onDeleteClick}
<<<<<<< HEAD
          aria-label={'Delete this space'}
=======
          aria-label={intl.formatMessage({
            id: 'xpack.spaces.management.deleteSpacesButton.deleteSpaceAriaLabel',
            defaultMessage: 'Delete this space',
          })}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          {...extraProps}
        >
          {buttonText}
        </ButtonComponent>
        {this.getConfirmDeleteModal()}
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

    const { spacesNavState, spacesManager } = this.props;

    return (
      <ConfirmDeleteModal
        space={this.props.space}
        spacesNavState={spacesNavState}
        spacesManager={spacesManager}
        onCancel={() => {
          this.setState({
            showConfirmDeleteModal: false,
          });
        }}
        onConfirm={this.deleteSpaces}
      />
    );
  };

  public deleteSpaces = async () => {
<<<<<<< HEAD
    const { spacesManager, space, spacesNavState } = this.props;
=======
    const { spacesManager, space, spacesNavState, intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

    try {
      await spacesManager.deleteSpace(space);
    } catch (error) {
      const { message: errorMessage = '' } = error.data || {};

<<<<<<< HEAD
      toastNotifications.addDanger(`Error deleting space: ${errorMessage}`);
=======
      toastNotifications.addDanger(
        intl.formatMessage(
          {
            id: 'xpack.spaces.management.deleteSpacesButton.deleteSpaceErrorTitle',
            defaultMessage: 'Error deleting space: {errorMessage}',
          },
          {
            errorMessage,
          }
        )
      );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    }

    this.setState({
      showConfirmDeleteModal: false,
    });

<<<<<<< HEAD
    const message = `Deleted "${space.name}" space.`;
=======
    const message = intl.formatMessage(
      {
        id:
          'xpack.spaces.management.deleteSpacesButton.spaceSuccessfullyDeletedNotificationMessage',
        defaultMessage: 'Deleted {spaceName} space.',
      },
      {
        spaceName: space.name,
      }
    );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

    toastNotifications.addSuccess(message);

    if (this.props.onDelete) {
      this.props.onDelete();
    }

    spacesNavState.refreshSpacesList();
  };
}
<<<<<<< HEAD
=======

export const DeleteSpacesButton = injectI18n(DeleteSpacesButtonUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
