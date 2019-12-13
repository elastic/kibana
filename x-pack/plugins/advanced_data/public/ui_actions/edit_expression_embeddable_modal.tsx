/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import {
  EuiTextArea,
  EuiFieldText,
  EuiModal,
  EuiFormRow,
  EuiButton,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpressionEmbeddable } from '../embeddable';

interface Props {
  embeddable: ExpressionEmbeddable;
  onClose: () => void;
}

interface State {
  expression?: string;
}

export class EditExpressionModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      expression: props.embeddable.getInput().expression,
    };
  }

  cancel = () => {
    this.props.onClose();
  };

  onChange = () => {
    this.props.embeddable.updateInput({ expression: this.state.expression });
    this.props.onClose();
  };

  public render() {
    return (
      <EuiModal maxWidth="700px" onClose={this.props.onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle data-test-subj="customizePanelTitle">
            {i18n.translate('xpack.advancedUiActions.customizeTimeRange.modal.headerTitle', {
              defaultMessage: 'Update expression',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFormRow label="">
            <EuiTextArea
              fullWidth
              value={this.state.expression}
              onChange={e => this.setState({ expression: e.target.value })}
            />
          </EuiFormRow>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="" onClick={this.onChange} fill>
                {'Update'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  }
}
