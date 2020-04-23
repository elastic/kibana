/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { Component, Fragment } from 'react';
import { EuiButton, EuiButtonIcon, EuiTextAlign } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MVTFieldDescriptor, MVTFieldType } from '../../../../common/descriptor_types';

export interface Props {
  fields: MVTFieldDescriptor[];
  onChange: (fields: MVTFieldDescriptor[]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface State {}

export class MVTFieldConfigEditor extends Component<Props, State> {
  state = {};

  _removeField(index) {
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
  };

  _renderFieldConfig() {
    return this.props.fields.map((mvtFieldConfig: MVTFieldDescriptor, index: number) => {
      return (
        <div key={mvtFieldConfig.name}>
          <span>{mvtFieldConfig.name}</span>
          <span>{mvtFieldConfig.type}</span>
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
        </div>
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
