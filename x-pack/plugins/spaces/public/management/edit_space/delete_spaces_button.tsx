/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { NotificationsStart } from 'src/core/public';
import { Space } from '../../../common/model/space';
import { SpacesManager } from '../../spaces_manager';
import { ConfirmDeleteModal } from '../components/confirm_delete_modal';

interface Props {
  style?: 'button' | 'icon';
  space: Space;
  spacesManager: SpacesManager;
  onDelete: () => void;
  notifications: NotificationsStart;
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
    const buttonText = (
      <FormattedMessage
        id="xpack.spaces.management.deleteSpacesButton.deleteSpaceButtonLabel"
        defaultMessage="Delete space"
      />
    );

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
          aria-label={i18n.translate(
            'xpack.spaces.management.deleteSpacesButton.deleteSpaceAriaLabel',
            {
              defaultMessage: 'Delete this space',
            }
          )}
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

    const { spacesManager } = this.props;

    return (
      <ConfirmDeleteModal
        space={this.props.space}
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
    const { spacesManager, space } = this.props;

    try {
      await spacesManager.deleteSpace(space);
    } catch (error) {
      const { message: errorMessage = '' } = error.data || {};

      this.props.notifications.toasts.addDanger(
        i18n.translate('xpack.spaces.management.deleteSpacesButton.deleteSpaceErrorTitle', {
          defaultMessage: 'Error deleting space: {errorMessage}',
          values: { errorMessage },
        })
      );
    }

    this.setState({
      showConfirmDeleteModal: false,
    });

    const message = i18n.translate(
      'xpack.spaces.management.deleteSpacesButton.spaceSuccessfullyDeletedNotificationMessage',
      {
        defaultMessage: 'Deleted {spaceName} space.',
        values: { spaceName: space.name },
      }
    );

    this.props.notifications.toasts.addSuccess(message);

    if (this.props.onDelete) {
      this.props.onDelete();
    }
  };
}
