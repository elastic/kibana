/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiForm, EuiButton, EuiSpacer, EuiTextAlign, EuiFormErrorText } from '@elastic/eui';
import { MultiIndexGeoFieldSelect } from '../multi_index_geo_field_select';
import { i18n } from '@kbn/i18n';

export class IndexGeometrySelectPopoverForm extends Component {
  static propTypes = {
    geoFields: PropTypes.array.isRequired,
    onSubmit: PropTypes.func.isRequired,
  };

  state = {
    selectedField: this.props.geoFields.length ? this.props.geoFields[0] : undefined,
  };

  _onGeoFieldChange = (selectedField) => {
    this.setState({ selectedField });
  };

  _onSubmit = () => {
    this.props.onSubmit({
      indexPatternId: this.state.selectedField.indexPatternId,
      geoFieldName: this.state.selectedField.geoFieldName,
      geoFieldType: this.state.selectedField.geoFieldType,
      indexPatternTitle: this.state.selectedField.indexPatternTitle,
    });
  };

  render() {
    let error;
    if (this.props.errorMsg) {
      error = <EuiFormErrorText>{this.props.errorMsg}</EuiFormErrorText>;
    }
    return (
      <EuiForm className={this.props.className}>
        <MultiIndexGeoFieldSelect
          selectedField={this.state.selectedField}
          fields={this.props.geoFields}
          onChange={this._onGeoFieldChange}
        />

        <EuiSpacer size="m" />

        {error}

        <EuiTextAlign textAlign="right">
          <EuiButton
            size="s"
            fill
            onClick={this._onSubmit}
            isDisabled={!this.state.selectedField}
            isLoading={this.props.isLoading}
          >
            {i18n.translate('xpack.maps.indexGeometrySelectPopoverForm.buttonTitle', {
              defaultMessage: 'Launch edit tool',
            })}
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
