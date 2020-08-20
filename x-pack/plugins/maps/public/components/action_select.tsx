/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiFormRow, EuiSuperSelect, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UiActionsActionDefinition } from 'src/plugins/ui_actions/public';
import { getApplyFilterLabel } from '../../common/i18n_getters';

export const ADD_FILTER_MAPS_ACTION = 'ADD_FILTER_MAPS_ACTION';

interface Props {
  value?: string;
  onChange: (value: string) => void;
  getFilterActions?: () => Promise<UiActionsActionDefinition[]>;
}

interface State {
  actions: UiActionsActionDefinition[];
}

export class ActionSelect extends Component<State, Props> {
  private _isMounted = false;
  state: State = {
    actions: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadActions();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadActions() {
    if (!this.props.getFilterActions) {
      return;
    }
    const actions = await this.props.getFilterActions();
    if (this._isMounted) {
      this.setState({ actions });
    }
  }

  render() {
    if (this.state.actions.length === 0) {
      return null;
    }

    const options = [
      {
        value: ADD_FILTER_MAPS_ACTION,
        inputDisplay: (
          <div>
            <EuiIcon className="mapActionSelectIcon" type="filter" />
            {getApplyFilterLabel()}
          </div>
        ),
      },
      ...this.state.actions.map((action) => {
        return {
          value: action.id,
          inputDisplay: (
            <div>
              <EuiIcon className="mapActionSelectIcon" type={action.getIconType()} />
              {action.getDisplayName()}
            </div>
          ),
        };
      }),
    ];

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.actionSelect.label', {
          defaultMessage: 'Action',
        })}
        display="rowCompressed"
      >
        <EuiSuperSelect
          compressed
          options={options}
          valueOfSelected={this.props.value ? this.props.value : ADD_FILTER_MAPS_ACTION}
          onChange={this.props.onChange}
        />
      </EuiFormRow>
    );
  }
}
