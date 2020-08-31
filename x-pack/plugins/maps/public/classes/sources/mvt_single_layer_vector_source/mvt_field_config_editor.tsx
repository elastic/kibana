/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Component, Fragment } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSuperSelect,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { MVTFieldDescriptor } from '../../../../common/descriptor_types';
import { FieldIcon } from '../../../../../../../src/plugins/kibana_react/public';
import { MVT_FIELD_TYPE } from '../../../../common/constants';

function makeOption({
  value,
  icon,
  message,
}: {
  value: MVT_FIELD_TYPE;
  icon: string;
  message: string;
}) {
  return {
    value,
    inputDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={null}>
          <FieldIcon type={icon} fill="none" />
        </EuiFlexItem>
        <EuiFlexItem>{message}</EuiFlexItem>
      </EuiFlexGroup>
    ),
  };
}

const FIELD_TYPE_OPTIONS = [
  {
    value: MVT_FIELD_TYPE.STRING,
    icon: 'string',
    message: i18n.translate('xpack.maps.mvtSource.stringFieldLabel', {
      defaultMessage: 'string',
    }),
  },
  {
    value: MVT_FIELD_TYPE.NUMBER,
    icon: 'number',
    message: i18n.translate('xpack.maps.mvtSource.numberFieldLabel', {
      defaultMessage: 'number',
    }),
  },
].map(makeOption);

interface Props {
  fields: MVTFieldDescriptor[];
  onChange: (fields: MVTFieldDescriptor[]) => void;
}

interface State {
  currentFields: MVTFieldDescriptor[];
}

export class MVTFieldConfigEditor extends Component<Props, State> {
  state: State = {
    currentFields: _.cloneDeep(this.props.fields),
  };

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
      type: MVT_FIELD_TYPE.STRING,
      name: '',
    });
    this._fieldChange(newFields);
  };

  _renderFieldTypeDropDown(mvtFieldConfig: MVTFieldDescriptor, index: number) {
    const onChange = (type: MVT_FIELD_TYPE) => {
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
        compressed
      />
    );
  }

  _renderFieldButtonDelete(index: number) {
    return (
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
    const hasDupes =
      this.state.currentFields.filter((field) => field.name === mvtFieldConfig.name).length > 1;

    return (
      <EuiFieldText
        value={mvtFieldConfig.name}
        onChange={onChange}
        aria-label={'Fieldname'}
        placeholder={i18n.translate('xpack.maps.mvtSource.fieldPlaceholderText', {
          defaultMessage: 'Field name',
        })}
        isInvalid={emptyName || hasDupes}
        compressed
      />
    );
  }

  _renderFieldConfig() {
    return this.state.currentFields.map((mvtFieldConfig: MVTFieldDescriptor, index: number) => {
      return (
        <>
          <EuiFlexGroup key={index} gutterSize="xs" alignItems="center">
            <EuiFlexItem>{this._renderFieldNameInput(mvtFieldConfig, index)}</EuiFlexItem>
            <EuiFlexItem>{this._renderFieldTypeDropDown(mvtFieldConfig, index)}</EuiFlexItem>
            <EuiFlexItem grow={false}>{this._renderFieldButtonDelete(index)}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size={'xs'} />
        </>
      );
    });
  }

  render() {
    return (
      <Fragment>
        {this._renderFieldConfig()}
        <EuiSpacer size={'s'} />
        <EuiFlexGroup justifyContent="spaceAround" alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={this._addField} size="xs" iconType="plusInCircleFilled">
              {i18n.translate('xpack.maps.mvtSource.addFieldLabel', {
                defaultMessage: 'Add',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }
}
