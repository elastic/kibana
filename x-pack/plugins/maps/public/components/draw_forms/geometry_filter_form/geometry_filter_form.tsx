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
import { ES_SPATIAL_RELATIONS } from '../../../../common/constants';
import { getEsSpatialRelationLabel } from '../../../../common/i18n_getters';
import { ActionSelect } from '../../action_select';
import { ACTION_GLOBAL_APPLY_FILTER } from '../../../../../../../src/plugins/unified_search/public';
import { Action, ActionExecutionContext } from '../../../../../../../src/plugins/ui_actions/public';

interface Props {
  buttonLabel: string;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  intitialGeometryLabel: string;
  onSubmit: ({
    actionId,
    geometryLabel,
    relation,
  }: {
    actionId: string;
    geometryLabel: string;
    relation: ES_SPATIAL_RELATIONS;
  }) => void;
  isFilterGeometryClosed?: boolean;
  errorMsg?: string;
  className?: string;
  isLoading?: boolean;
}

export class GeometryFilterForm extends Component<Props> {
  static defaultProps = {
    isFilterGeometryClosed: true,
  };

  state = {
    actionId: ACTION_GLOBAL_APPLY_FILTER,
    geometryLabel: this.props.intitialGeometryLabel,
    relation: ES_SPATIAL_RELATIONS.INTERSECTS,
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
      relation: this.state.relation,
    });
  };

  _renderRelationInput() {
    const options = Object.values(ES_SPATIAL_RELATIONS).map((relation) => {
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
            isDisabled={!this.state.geometryLabel}
            isLoading={this.props.isLoading}
          >
            {this.props.buttonLabel}
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
