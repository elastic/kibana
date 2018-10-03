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
  EuiSpacer,
  EuiText,
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

export class CustomizeSpace extends Component<Props, {}> {
  public render() {
    const { validator, editingExistingSpace } = this.props;
    const { name = '', description = '' } = this.props.space;
    return (
      <EuiPanel>
        <EuiDescribedFormGroup
          title={<h3>Customize your space</h3>}
          description={this.getPanelDescription()}
        >
          <EuiFormRow label="Name" {...validator.validateSpaceName(this.props.space)} fullWidth>
            <EuiFieldText
              name="name"
              placeholder={'Awesome space'}
              value={name}
              onChange={this.onNameChange}
              fullWidth
            />
          </EuiFormRow>

          {name && (
            <Fragment>
              <EuiFlexGroup responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Avatar">
                    <SpaceAvatar space={this.props.space} size="l" />
                  </EuiFormRow>
                </EuiFlexItem>
                <CustomizeSpaceAvatar space={this.props.space} onChange={this.onAvatarChange} />
              </EuiFlexGroup>
              <EuiSpacer />
            </Fragment>
          )}

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
            {...validator.validateSpaceDescription(this.props.space)}
            fullWidth
          >
            <EuiFieldText
              name="description"
              placeholder={'This is where the magic happens'}
              value={description}
              onChange={this.onDescriptionChange}
              fullWidth
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiPanel>
    );
  }

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

    const canUpdateId = !this.props.editingExistingSpace;

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

  public onDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.props.onChange({
      ...this.props.space,
      description: e.target.value,
    });
  };

  public onSpaceIdentifierChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.props.onChange({
      ...this.props.space,
      id: toSpaceIdentifier(e.target.value),
    });
  };

  public onAvatarChange = (space: Partial<Space>) => {
    this.props.onChange(space);
  };
}
