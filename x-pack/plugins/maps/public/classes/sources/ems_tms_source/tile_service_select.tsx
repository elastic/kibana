/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import { EuiSelect, EuiSelectOption, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { EMSTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { getEmsTmsServices } from '../../../util';
import { getEmsUnavailableMessage } from '../../../components/ems_unavailable_message';

const AUTO_SELECT = 'auto_select';

export type EmsTmsSourceConfig = Pick<EMSTMSSourceDescriptor, 'id' | 'isAutoSelect'>;

interface Props {
  config?: EmsTmsSourceConfig;
  onTileSelect: (sourceConfig: EmsTmsSourceConfig) => void;
}

interface State {
  emsTmsOptions: EuiSelectOption[];
  hasLoaded: boolean;
}

export class TileServiceSelect extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
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

  _onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const isAutoSelect = value === AUTO_SELECT;
    this.props.onTileSelect({
      id: isAutoSelect ? undefined : value,
      isAutoSelect,
    });
  };

  render() {
    const helpText = this.state.emsTmsOptions.length === 0 ? getEmsUnavailableMessage() : null;

    let selectedId: string | undefined;
    if (this.props.config) {
      selectedId = this.props.config.isAutoSelect ? AUTO_SELECT : this.props.config.id!;
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
