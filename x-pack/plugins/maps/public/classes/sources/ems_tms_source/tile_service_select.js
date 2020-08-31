/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSelect, EuiFormRow } from '@elastic/eui';

import { getEmsTmsServices } from '../../../meta';
import { getEmsUnavailableMessage } from '../../../components/ems_unavailable_message';
import { i18n } from '@kbn/i18n';

export const AUTO_SELECT = 'auto_select';

export class TileServiceSelect extends React.Component {
  state = {
    emsTmsOptions: [],
    hasLoaded: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadTmsOptions();
  }

  _loadTmsOptions = async () => {
    const emsTMSServices = await getEmsTmsServices();

    if (!this._isMounted) {
      return;
    }

    const emsTmsOptions = emsTMSServices.map((tmsService) => {
      return {
        value: tmsService.getId(),
        text: tmsService.getDisplayName() ? tmsService.getDisplayName() : tmsService.getId(),
      };
    });
    emsTmsOptions.unshift({
      value: AUTO_SELECT,
      text: i18n.translate('xpack.maps.source.emsTile.autoLabel', {
        defaultMessage: 'Autoselect based on Kibana theme',
      }),
    });
    this.setState({ emsTmsOptions, hasLoaded: true });
  };

  _onChange = (e) => {
    const value = e.target.value;
    const isAutoSelect = value === AUTO_SELECT;
    this.props.onTileSelect({
      id: isAutoSelect ? null : value,
      isAutoSelect,
    });
  };

  render() {
    const helpText =
      this.state.hasLoaded && this.state.emsTmsOptions.length === 0
        ? getEmsUnavailableMessage()
        : null;

    let selectedId;
    if (this.props.config) {
      selectedId = this.props.config.isAutoSelect ? AUTO_SELECT : this.props.config.id;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.emsTile.label', {
          defaultMessage: 'Tile service',
        })}
        helpText={helpText}
        display="columnCompressed"
      >
        <EuiSelect
          hasNoInitialSelection={!selectedId}
          value={selectedId}
          options={this.state.emsTmsOptions}
          onChange={this._onChange}
          isLoading={!this.state.hasLoaded}
          disabled={this.state.hasLoaded && this.state.emsTmsOptions.length === 0}
          compressed
        />
      </EuiFormRow>
    );
  }
}
