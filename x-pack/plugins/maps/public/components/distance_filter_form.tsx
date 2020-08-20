/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ChangeEvent } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiTextAlign,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UiActionsActionDefinition } from 'src/plugins/ui_actions/public';
import { MultiIndexGeoFieldSelect } from './multi_index_geo_field_select';
import { GeoFieldWithIndex } from './geo_field_with_index';
import { ActionSelect, ADD_FILTER_MAPS_ACTION } from './action_select';

interface Props {
  className?: string;
  buttonLabel: string;
  geoFields: GeoFieldWithIndex[];
  getFilterActions?: () => Promise<UiActionsActionDefinition[]>;
  onSubmit: ({
    filterLabel,
    indexPatternId,
    geoFieldName,
  }: {
    filterLabel: string;
    indexPatternId: string;
    geoFieldName: string;
  }) => void;
}

interface State {
  actionId: string;
  selectedField: GeoFieldWithIndex | undefined;
  filterLabel: string;
}

export class DistanceFilterForm extends Component<Props, State> {
  state: State = {
    actionId: ADD_FILTER_MAPS_ACTION,
    selectedField: this.props.geoFields.length ? this.props.geoFields[0] : undefined,
    filterLabel: '',
  };

  _onGeoFieldChange = (selectedField: GeoFieldWithIndex | undefined) => {
    this.setState({ selectedField });
  };

  _onFilterLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      filterLabel: e.target.value,
    });
  };

  _onActionIdChange = (value) => {
    this.setState({ actionId: value });
  };

  _onSubmit = () => {
    if (!this.state.selectedField) {
      return;
    }
    this.props.onSubmit({
      actionId: this.state.actionId,
      filterLabel: this.state.filterLabel,
      indexPatternId: this.state.selectedField.indexPatternId,
      geoFieldName: this.state.selectedField.geoFieldName,
    });
  };

  render() {
    return (
      <EuiForm className={this.props.className}>
        <EuiFormRow
          label={i18n.translate('xpack.maps.distanceFilterForm.filterLabelLabel', {
            defaultMessage: 'Filter label',
          })}
          display="rowCompressed"
        >
          <EuiFieldText
            compressed
            value={this.state.filterLabel}
            onChange={this._onFilterLabelChange}
          />
        </EuiFormRow>

        <MultiIndexGeoFieldSelect
          selectedField={this.state.selectedField}
          fields={this.props.geoFields}
          onChange={this._onGeoFieldChange}
        />

        <ActionSelect
          getFilterActions={this.props.getFilterActions}
          value={this.state.actionId}
          onChange={this._onActionIdChange}
        />

        <EuiSpacer size="m" />

        <EuiTextAlign textAlign="right">
          <EuiButton size="s" fill onClick={this._onSubmit} isDisabled={!this.state.selectedField}>
            {this.props.buttonLabel}
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
