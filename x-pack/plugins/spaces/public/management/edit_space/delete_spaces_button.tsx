/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonIconProps } from '@elastic/eui';
import { EuiButton, EuiButtonIcon } from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NotificationsStart } from 'src/core/public';

import type { Space } from '../../../common';
import type { SpacesManager } from '../../spaces_manager';
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

    let extraProps: EuiButtonIconProps | undefined;

    if (this.props.style === 'icon') {
      ButtonComponent = EuiButtonIcon;
      extraProps = { iconType: 'trash' };
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
        onSuccess={() => {
          this.setState({
            showConfirmDeleteModal: false,
          });
          this.props.onDelete?.();
        }}
      />
    );
  };
}
