/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers } from '../meta';
import { getEmsUnavailableMessage } from './ems_unavailable_message';

interface Props {
  onChange: (emsFileId: string) => void;
  value: string | null;
}

interface State {
  hasLoadedOptions: boolean;
  emsFileOptions: Array<EuiComboBoxOptionOption<string>>;
}

export class EMSFileSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    hasLoadedOptions: false,
    emsFileOptions: [],
  };

  _loadFileOptions = async () => {
    const fileLayers: FileLayer[] = await getEmsFileLayers();
    const options = fileLayers.map((fileLayer) => {
      return {
        value: fileLayer.getId(),
        label: fileLayer.getDisplayName(),
      };
    });
    if (this._isMounted) {
      this.setState({
        hasLoadedOptions: true,
        emsFileOptions: options,
      });
    }
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFileOptions();
  }

  _onChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (selectedOptions.length === 0) {
      return;
    }

    this.props.onChange(selectedOptions[0].value!);
  };

  _renderSelect() {
    if (!this.state.hasLoadedOptions) {
      return <EuiSelect isLoading />;
    }

    const selectedOption = this.state.emsFileOptions.find(
      (option: EuiComboBoxOptionOption<string>) => {
        return option.value === this.props.value;
      }
    );

    return (
      <EuiComboBox
        placeholder={i18n.translate('xpack.maps.emsFileSelect.selectPlaceholder', {
          defaultMessage: 'Select EMS layer',
        })}
        options={this.state.emsFileOptions}
        selectedOptions={selectedOption ? [selectedOption!] : []}
        onChange={this._onChange}
        isClearable={false}
        singleSelection={true}
        isDisabled={this.state.emsFileOptions.length === 0}
        data-test-subj="emsVectorComboBox"
      />
    );
  }

  render() {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.emsFileSelect.selectLabel', {
          defaultMessage: 'Layer',
        })}
        helpText={this.state.emsFileOptions.length === 0 ? getEmsUnavailableMessage() : null}
      >
        {this._renderSelect()}
      </EuiFormRow>
    );
  }
}
