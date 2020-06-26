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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { MVTFieldDescriptor } from '../../../../common/descriptor_types';
import { FieldIcon } from '../../../../../../../src/plugins/kibana_react/public';
import { MVTFieldType } from '../../../../common/constants';

const FIELD_TYPE_OPTIONS = [
  {
    value: MVTFieldType.STRING,
    inputDisplay: (
      <span>
        <FieldIcon type={'string'} />
        <span>
          {i18n.translate('xpack.maps.mvtSource.stringFieldLabel', {
            defaultMessage: 'string',
          })}
        </span>
      </span>
    ),
  },
  {
    value: MVTFieldType.NUMBER,
    inputDisplay: (
      <span>
        <FieldIcon type={'number'} />
        <span>
          {i18n.translate('xpack.maps.mvtSource.numberFieldLabel', {
            defaultMessage: 'number',
          })}
        </span>
      </span>
    ),
  },
];

export interface Props {
  fields: MVTFieldDescriptor[];
  onChange: (fields: MVTFieldDescriptor[]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface State {
  previousFields: MVTFieldDescriptor[];
  currentFields: MVTFieldDescriptor[];
}

export class MVTFieldConfigEditor extends Component<Props, State> {
  state: State = {
    currentFields: [],
    previousFields: [],
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (_.isEqual(nextProps.fields, prevState.previousFields)) {
      return null;
    }
    const clonedFields = _.cloneDeep(nextProps.fields);
    return {
      currentFields: clonedFields,
      previousFields: clonedFields,
    };
  }

  _notifyChange = _.debounce(() => {
    const invalid = this.state.currentFields.some((field: MVTFieldDescriptor) => {
      return field.name === '';
    });

    if (!invalid) {
      this.props.onChange(this.state.currentFields);
    }
  });

  _fieldChange(newFields: MVTFieldDescriptor[]) {
    this.setState(
      {
        currentFields: newFields,
      },
      this._notifyChange
    );
  }

  _removeField(index: number) {
    const newFields: MVTFieldDescriptor[] = this.state.currentFields.slice();
    newFields.splice(index, 1);
    this._fieldChange(newFields);
  }

  _addField = () => {
    const newFields: MVTFieldDescriptor[] = this.state.currentFields.slice();
    newFields.push({
      type: MVTFieldType.STRING,
      name: '',
    });
    this._fieldChange(newFields);
  };

  _renderFieldTypeDropDown(mvtFieldConfig: MVTFieldDescriptor, index: number) {
    const onChange = (type: MVTFieldType) => {
      const newFields = this.state.currentFields.slice();
      newFields[index] = {
        type,
        name: newFields[index].name,
      };
      this._fieldChange(newFields);
    };

    return (
      <EuiSuperSelect
        options={FIELD_TYPE_OPTIONS}
        valueOfSelected={mvtFieldConfig.type}
        onChange={(value) => onChange(value)}
      />
    );
  }

  _renderFieldNameInput(mvtFieldConfig: MVTFieldDescriptor, index: number) {
    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      const newFields = this.state.currentFields.slice();
      newFields[index] = {
        name,
        type: newFields[index].type,
      };
      this._fieldChange(newFields);
    };

    const emptyName = mvtFieldConfig.name === '';
    let hasDupes = false;
    for (let i = 0; i < this.state.currentFields.length; i++) {
      if (i !== index && mvtFieldConfig.name === this.state.currentFields[i].name) {
        hasDupes = true;
        break;
      }
    }
    const isInvalid = emptyName || hasDupes;
    const placeholderText = isInvalid
      ? i18n.translate('xpack.maps.mvtSource.fieldPlaceholderText', {
          defaultMessage: 'Field name',
        })
      : '';

    return (
      <EuiFieldText
        value={mvtFieldConfig.name}
        onChange={onChange}
        aria-label={'Fieldname'}
        placeholder={placeholderText}
        isInvalid={isInvalid}
      />
    );
  }

  _renderFieldConfig() {
    return this.state.currentFields.map((mvtFieldConfig: MVTFieldDescriptor, index: number) => {
      return (
        <EuiFlexGroup key={index} gutterSize="xs">
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
        <EuiSpacer size={'xs'} />
        <EuiButton fill isDisabled={false} onClick={this._addField} size="s">
          {'Add field'}
        </EuiButton>
      </Fragment>
    );
  }
}
