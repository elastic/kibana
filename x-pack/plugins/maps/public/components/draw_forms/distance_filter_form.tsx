/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { ActionSelect } from '../action_select';
import { ACTION_GLOBAL_APPLY_FILTER } from '../../../../../../src/plugins/unified_search/public';

interface Props {
  className?: string;
  buttonLabel: string;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSubmit: ({ actionId, filterLabel }: { actionId: string; filterLabel: string }) => void;
}

interface State {
  actionId: string;
  filterLabel: string;
}

export class DistanceFilterForm extends Component<Props, State> {
  state: State = {
    actionId: ACTION_GLOBAL_APPLY_FILTER,
    filterLabel: '',
  };

  _onFilterLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      filterLabel: e.target.value,
    });
  };

  _onActionIdChange = (value: string) => {
    this.setState({ actionId: value });
  };

  _onSubmit = () => {
    this.props.onSubmit({
      actionId: this.state.actionId,
      filterLabel: this.state.filterLabel,
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

        <ActionSelect
          getFilterActions={this.props.getFilterActions}
          getActionContext={this.props.getActionContext}
          value={this.state.actionId}
          onChange={this._onActionIdChange}
        />

        <EuiSpacer size="m" />

        <EuiTextAlign textAlign="right">
          <EuiButton size="s" fill onClick={this._onSubmit}>
            {this.props.buttonLabel}
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
