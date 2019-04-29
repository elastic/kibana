/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
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
  intl: InjectedIntl;
}

interface State {
  showConfirmDeleteModal: boolean;
  showConfirmRedirectModal: boolean;
}

class DeleteSpacesButtonUI extends Component<Props, State> {
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
    const { intl } = this.props;

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
          aria-label={intl.formatMessage({
            id: 'xpack.spaces.management.deleteSpacesButton.deleteSpaceAriaLabel',
            defaultMessage: 'Delete this space',
          })}
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
    const { spacesManager, space, spacesNavState, intl } = this.props;

    try {
      await spacesManager.deleteSpace(space);
    } catch (error) {
      const { message: errorMessage = '' } = error.data || {};

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
    }

    this.setState({
      showConfirmDeleteModal: false,
    });

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

    toastNotifications.addSuccess(message);

    if (this.props.onDelete) {
      this.props.onDelete();
    }

    spacesNavState.refreshSpacesList();
  };
}

export const DeleteSpacesButton = injectI18n(DeleteSpacesButtonUI);
