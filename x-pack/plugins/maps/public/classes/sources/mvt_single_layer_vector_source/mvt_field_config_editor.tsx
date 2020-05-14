/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { ChangeEvent, Component, Fragment } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MVTFieldDescriptor, MVTFieldType } from '../../../../common/descriptor_types';
import { FieldIcon } from '../../../../../../../src/plugins/kibana_react/public';

const FIELD_TYPE_OPTIONS = [
  {
    value: MVTFieldType.String,
    inputDisplay: (
      <span>
        <FieldIcon type={'string'} />
        <span>String</span>
      </span>
    ),
  },
  {
    value: MVTFieldType.Number,
    inputDisplay: (
      <span>
        <FieldIcon type={'number'} />
        <span>Number</span>
      </span>
    ),
  },
];

export interface Props {
  fields: MVTFieldDescriptor[];
  onChange: (fields: MVTFieldDescriptor[]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface State {}

export class MVTFieldConfigEditor extends Component<Props, State> {
  state = {};

  _removeField(index: number) {
    const newFields = this.props.fields.slice();
    newFields.splice(index, 1);

    this.props.onChange(newFields);
  }

  _addField = () => {
    const newFields = this.props.fields.slice();
    newFields.push({
      type: MVTFieldType.String,
      name: 'Foobar',
    });
    this.props.onChange(newFields);
  };

  _renderFieldTypeDropDown(mvtFieldConfig: MVTFieldDescriptor, index: number) {
    const onChange = (type: MVTFieldType) => {
      const newFields = this.props.fields.slice();
      newFields[index].type = type;
      this.props.onChange(newFields);
    };

    return (
      <EuiSuperSelect
        options={FIELD_TYPE_OPTIONS}
        valueOfSelected={mvtFieldConfig.type}
        onChange={value => onChange(value)}
      />
    );
  }

  _renderFieldNameInput(mvtFieldConfig: MVTFieldDescriptor, index: number) {
    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      const newFields = this.props.fields.slice();
      newFields[index].name = name;
      this.props.onChange(newFields);
    };
    return (
      <EuiFieldText value={mvtFieldConfig.name} onChange={onChange} aria-label={'Fieldname'} />
    );
  }

  _renderFieldConfig() {
    return this.props.fields.map((mvtFieldConfig: MVTFieldDescriptor, index: number) => {
      return (
        <EuiFlexGroup key={index}>
          <EuiFlexItem>{this._renderFieldNameInput(mvtFieldConfig, index)}</EuiFlexItem>
          <EuiFlexItem>{this._renderFieldTypeDropDown(mvtFieldConfig, index)}</EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              onClick={() => {
                this._removeField(index);
              }}
              title={i18n.translate('xpack.maps.mvtSource.trashButtonTitle', {
                defaultMessage: 'Remove field',
              })}
              aria-label={i18n.translate('xpack.maps.mvtSource.trashButtonAriaLabel', {
                defaultMessage: 'Remove field',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    });
  }

  render() {
    return (
      <Fragment>
        {this._renderFieldConfig()}
        <EuiButton fill isDisabled={false} onClick={this._addField} size="s">
          {'Add field'}
        </EuiButton>
      </Fragment>
    );
  }
}
