/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSelect,
  EuiSpacer,
  EuiTextAlign,
  EuiFormErrorText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_GEO_FIELD_TYPE, ES_SPATIAL_RELATIONS } from '../../common/constants';
import { getEsSpatialRelationLabel } from '../../common/i18n_getters';
import { MultiIndexGeoFieldSelect } from './multi_index_geo_field_select';
import { ActionSelect } from './action_select';
import { ACTION_GLOBAL_APPLY_FILTER } from '../../../../../src/plugins/data/public';

export class GeometryFilterForm extends Component {
  static propTypes = {
    buttonLabel: PropTypes.string.isRequired,
    geoFields: PropTypes.array.isRequired,
    getFilterActions: PropTypes.func,
    getActionContext: PropTypes.func,
    intitialGeometryLabel: PropTypes.string.isRequired,
    onSubmit: PropTypes.func.isRequired,
    isFilterGeometryClosed: PropTypes.bool,
    errorMsg: PropTypes.string,
  };

  static defaultProps = {
    isFilterGeometryClosed: true,
  };

  state = {
    actionId: ACTION_GLOBAL_APPLY_FILTER,
    selectedField: this.props.geoFields.length ? this.props.geoFields[0] : undefined,
    geometryLabel: this.props.intitialGeometryLabel,
    relation: ES_SPATIAL_RELATIONS.INTERSECTS,
  };

  _onGeoFieldChange = (selectedField) => {
    this.setState({ selectedField });
  };

  _onGeometryLabelChange = (e) => {
    this.setState({
      geometryLabel: e.target.value,
    });
  };

  _onRelationChange = (e) => {
    this.setState({
      relation: e.target.value,
    });
  };

  _onActionIdChange = (value) => {
    this.setState({ actionId: value });
  };

  _onSubmit = () => {
    this.props.onSubmit({
      actionId: this.state.actionId,
      geometryLabel: this.state.geometryLabel,
      indexPatternId: this.state.selectedField.indexPatternId,
      geoFieldName: this.state.selectedField.geoFieldName,
      geoFieldType: this.state.selectedField.geoFieldType,
      relation: this.state.relation,
    });
  };

  _renderRelationInput() {
    // relationship only used when filtering geo_shape fields
    if (
      !this.state.selectedField ||
      this.state.selectedField.geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT
    ) {
      return null;
    }

    const spatialRelations = this.props.isFilterGeometryClosed
      ? Object.values(ES_SPATIAL_RELATIONS)
      : Object.values(ES_SPATIAL_RELATIONS).filter((relation) => {
          // can not filter by within relation when filtering geometry is not closed
          return relation !== ES_SPATIAL_RELATIONS.WITHIN;
        });
    const options = spatialRelations.map((relation) => {
      return {
        value: relation,
        text: getEsSpatialRelationLabel(relation),
      };
    });

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.geometryFilterForm.relationLabel', {
          defaultMessage: 'Spatial relation',
        })}
        display="rowCompressed"
      >
        <EuiSelect
          compressed
          options={options}
          value={this.state.relation}
          onChange={this._onRelationChange}
        />
      </EuiFormRow>
    );
  }

  render() {
    let error;
    if (this.props.errorMsg) {
      error = <EuiFormErrorText>{this.props.errorMsg}</EuiFormErrorText>;
    }
    return (
      <EuiForm className={this.props.className}>
        <EuiFormRow
          label={i18n.translate('xpack.maps.geometryFilterForm.geometryLabelLabel', {
            defaultMessage: 'Geometry label',
          })}
          display="rowCompressed"
        >
          <EuiFieldText
            compressed
            value={this.state.geometryLabel}
            onChange={this._onGeometryLabelChange}
          />
        </EuiFormRow>

        <MultiIndexGeoFieldSelect
          selectedField={this.state.selectedField}
          fields={this.props.geoFields}
          onChange={this._onGeoFieldChange}
        />

        {this._renderRelationInput()}

        <ActionSelect
          getFilterActions={this.props.getFilterActions}
          getActionContext={this.props.getActionContext}
          value={this.state.actionId}
          onChange={this._onActionIdChange}
        />

        <EuiSpacer size="m" />

        {error}

        <EuiTextAlign textAlign="right">
          <EuiButton
            size="s"
            fill
            onClick={this._onSubmit}
            isDisabled={!this.state.geometryLabel || !this.state.selectedField}
            isLoading={this.props.isLoading}
          >
            {this.props.buttonLabel}
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
