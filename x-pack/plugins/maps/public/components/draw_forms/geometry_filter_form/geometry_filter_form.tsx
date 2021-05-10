/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
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
import { ES_GEO_FIELD_TYPE, ES_SPATIAL_RELATIONS } from '../../../../common/constants';
import { getEsSpatialRelationLabel } from '../../../../common/i18n_getters';
import { MultiIndexGeoFieldSelect } from '../../multi_index_geo_field_select';
import { ActionSelect } from '../../action_select';
import { ACTION_GLOBAL_APPLY_FILTER } from '../../../../../../../src/plugins/data/public';
import { GeoFieldWithIndex } from '../../geo_field_with_index';
import { Action, ActionExecutionContext } from '../../../../../../../src/plugins/ui_actions/public';

export interface Props {
  buttonLabel: string;
  geoFields: GeoFieldWithIndex[];
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  intitialGeometryLabel: string;
  onSubmit: (options: {
    actionId: string;
    geometryLabel?: string;
    indexPatternId?: string;
    geoFieldName?: string;
    geoFieldType?: ES_GEO_FIELD_TYPE;
    relation?: ES_SPATIAL_RELATIONS;
  }) => void;
  isFilterGeometryClosed?: boolean;
  errorMsg?: string;
  className: string;
  isLoading?: boolean;
}

interface State {
  actionId: string;
  selectedField: GeoFieldWithIndex | undefined;
  geometryLabel: string;
  relation: ES_SPATIAL_RELATIONS;
}

export class GeometryFilterForm extends Component<Props> {
  state: State = {
    actionId: ACTION_GLOBAL_APPLY_FILTER,
    selectedField: this.props.geoFields.length ? this.props.geoFields[0] : undefined,
    geometryLabel: this.props.intitialGeometryLabel,
    relation: ES_SPATIAL_RELATIONS.INTERSECTS,
  };

  _onGeoFieldChange = (selectedField: GeoFieldWithIndex | undefined) => {
    this.setState({ selectedField });
  };

  _onGeometryLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      geometryLabel: e.target.value,
    });
  };

  _onRelationChange = (e: ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      relation: e.target.value,
    });
  };

  _onActionIdChange = (value: string) => {
    this.setState({ actionId: value });
  };

  _onSubmit = () => {
    this.props.onSubmit({
      actionId: this.state.actionId,
      geometryLabel: this.state.geometryLabel,
      indexPatternId: this.state.selectedField
        ? this.state.selectedField.indexPatternId
        : undefined,
      geoFieldName: this.state.selectedField ? this.state.selectedField.geoFieldName : undefined,
      relation: this.state.relation,
    });
  };

  _renderRelationInput() {
    // relationship only used when filtering geo_shape fields
    if (!this.state.selectedField) {
      return null;
    }
    let _isFilterGeometryClosed = true;
    if (this.props.isFilterGeometryClosed !== undefined) {
      _isFilterGeometryClosed = this.props.isFilterGeometryClosed;
    }

    const spatialRelations =
      _isFilterGeometryClosed &&
      this.state.selectedField.geoFieldType !== ES_GEO_FIELD_TYPE.GEO_POINT
        ? Object.values(ES_SPATIAL_RELATIONS)
        : Object.values(ES_SPATIAL_RELATIONS).filter((relation) => {
            // - cannot filter by "within"-relation when filtering geometry is not closed
            // - do not distinguish between intersects/within for filtering for points since they are equivalent
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
