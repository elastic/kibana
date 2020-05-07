/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { AssignmentActionType } from '../table';

interface ActionControlProps {
  action: AssignmentActionType;
  disabled: boolean;
  danger?: boolean;
  name: string;
  showWarning?: boolean;
  warningHeading?: string;
  warningMessage?: string;
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

interface ActionControlState {
  showModal: boolean;
}

export class ActionControl extends React.PureComponent<ActionControlProps, ActionControlState> {
  constructor(props: ActionControlProps) {
    super(props);

    this.state = {
      showModal: false,
    };
  }

  public render() {
    const {
      action,
      actionHandler,
      danger,
      name,
      showWarning,
      warningHeading,
      warningMessage,
    } = this.props;

    return (
      <div>
        <EuiButton
          size="s"
          color={danger ? 'danger' : 'primary'}
          disabled={this.props.disabled}
          onClick={
            showWarning ? () => this.setState({ showModal: true }) : () => actionHandler(action)
          }
        >
          {name}
        </EuiButton>
        {this.state.showModal && (
          <EuiOverlayMask>
            <EuiConfirmModal
              buttonColor={danger ? 'danger' : 'primary'}
              cancelButtonText={
                <FormattedMessage
                  id="xpack.beatsManagement.confirmModal.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              }
              confirmButtonText={
                <FormattedMessage
                  id="xpack.beatsManagement.confirmModal.confirmButtonLabel"
                  defaultMessage="Confirm"
                />
              }
              onConfirm={() => {
                actionHandler(action);
                this.setState({ showModal: false });
              }}
              onCancel={() => this.setState({ showModal: false })}
              title={
                warningHeading ? (
                  warningHeading
                ) : (
                  <FormattedMessage
                    id="xpack.beatsManagement.confirmModal.confirmWarningTitle"
                    defaultMessage="Confirm"
                  />
                )
              }
            >
              {warningMessage}
            </EuiConfirmModal>
          </EuiOverlayMask>
        )}
      </div>
    );
  }
}
