/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { isReservedSpace } from 'x-pack/plugins/spaces/common';
import { Space } from 'x-pack/plugins/spaces/common/model/space';
import { SpaceAvatar } from '../../../../components';
import { SpaceValidator, toSpaceIdentifier } from '../../lib';
import { CustomizeSpaceAvatar } from './customize_space_avatar';
import { SpaceIdentifier } from './space_identifier';

interface Props {
  validator: SpaceValidator;
  space: Partial<Space>;
  editingExistingSpace: boolean;
  onChange: (space: Partial<Space>) => void;
}

interface State {
  customizingAvatar: boolean;
  usingCustomIdentifier: boolean;
}

export class CustomizeSpace extends Component<Props, State> {
  public state = {
    customizingAvatar: false,
    usingCustomIdentifier: false,
  };

  public render() {
    const { validator, editingExistingSpace } = this.props;
    const { name = '', description = '' } = this.props.space;
    return (
      <EuiPanel>
        <EuiDescribedFormGroup
          title={<h3>Customize your space</h3>}
          description={this.getPanelDescription()}
          fullWidth
        >
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem>
              <EuiFormRow label="Name" {...validator.validateSpaceName(this.props.space)} fullWidth>
                <EuiFieldText
                  name="name"
                  placeholder={'Awesome space'}
                  value={name}
                  onChange={this.onNameChange}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow label="Avatar">
                <EuiPopover
                  id="customizeAvatarPopover"
                  button={
                    <button title="Click to customize" onClick={this.togglePopover}>
                      <SpaceAvatar space={this.props.space} size="l" />
                    </button>
                  }
                  closePopover={this.closePopover}
                  isOpen={this.state.customizingAvatar}
                >
                  <div style={{ maxWidth: 240 }}>
                    <CustomizeSpaceAvatar space={this.props.space} onChange={this.onAvatarChange} />
                  </div>
                </EuiPopover>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          {this.props.space && isReservedSpace(this.props.space) ? null : (
            <Fragment>
              <SpaceIdentifier
                space={this.props.space}
                editable={!editingExistingSpace}
                onChange={this.onSpaceIdentifierChange}
                validator={validator}
              />
            </Fragment>
          )}

          <EuiFormRow
            label="Description (optional)"
            helpText="Displayed alongside the space avatar on the space selection screen"
            {...validator.validateSpaceDescription(this.props.space)}
            fullWidth
          >
            <EuiTextArea
              name="description"
              value={description}
              onChange={this.onDescriptionChange}
              fullWidth
              rows={2}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiPanel>
    );
  }

  public togglePopover = () => {
    this.setState({
      customizingAvatar: !this.state.customizingAvatar,
    });
  };

  public closePopover = () => {
    this.setState({
      customizingAvatar: false,
    });
  };

  public getPanelDescription = () => {
    return (
      <EuiText>
        <p>Give your space a meaningful name, and customize its avatar to your liking.</p>
        {this.props.editingExistingSpace ? (
          <p>The url identifier cannot be changed.</p>
        ) : (
          <p>Take note of the url identifier. It cannot be changed after the space is created.</p>
        )}
      </EuiText>
    );
  };

  public onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!this.props.space) {
      return;
    }

    const canUpdateId = !this.props.editingExistingSpace && !this.state.usingCustomIdentifier;

    let { id } = this.props.space;

    if (canUpdateId) {
      id = toSpaceIdentifier(e.target.value);
    }

    this.props.onChange({
      ...this.props.space,
      name: e.target.value,
      id,
    });
  };

  public onDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onChange({
      ...this.props.space,
      description: e.target.value,
    });
  };

  public onSpaceIdentifierChange = (updatedIdentifier: string) => {
    const usingCustomIdentifier = updatedIdentifier !== toSpaceIdentifier(this.props.space.name);

    this.setState({
      usingCustomIdentifier,
    });
    this.props.onChange({
      ...this.props.space,
      id: toSpaceIdentifier(updatedIdentifier),
    });
  };

  public onAvatarChange = (space: Partial<Space>) => {
    this.props.onChange(space);
  };
}
