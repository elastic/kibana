/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSelect,
} from '@elastic/eui';
import React from 'react';
import {
  ActionFactory,
  actionFactoryRegistry,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';

interface Props {
  onCreate: (type: string) => void;
  onClose: () => void;
  actionTypes?: string[];
}

interface State {
  newFactoryType: string;
}

export class CreateNewActionModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      newFactoryType: this.getActionFactoryOptions()[0].value,
    };
  }

  public render() {
    return (
      <EuiOverlayMask>
        <EuiModal onClose={this.props.onClose}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Choose a type of action to create</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiSelect
              options={this.getActionFactoryOptions()}
              value={this.state.newFactoryType}
              onChange={this.changeFactoryType}
            />
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={this.props.onClose}>Cancel</EuiButtonEmpty>

            <EuiButton onClick={() => this.props.onCreate(this.state.newFactoryType)}>
              Create
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  private getActionFactoryOptions() {
    return Object.values(actionFactoryRegistry.getFactories())
      .filter(factory => {
        return (
          (!this.props.actionTypes || this.props.actionTypes.find(type => type === factory.id))
        );
      })
      .map((factory: ActionFactory) => ({
        value: factory.id,
        text: factory.title,
      }));
  }

  private changeFactoryType = (e: any) => {
    this.setState({ newFactoryType: e.target.value });
  };
}
