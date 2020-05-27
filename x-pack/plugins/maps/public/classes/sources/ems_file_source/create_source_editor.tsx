/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { getEMSClient } from '../../../meta';
import { getEmsUnavailableMessage } from '../ems_unavailable_message';
import { EMSFileSourceDescriptor } from '../../../../common/descriptor_types';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<EMSFileSourceDescriptor>) => void;
}

interface State {
  hasLoadedOptions: boolean;
  emsFileOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedOption: EuiComboBoxOptionOption<string> | null;
}

export class EMSFileCreateSourceEditor extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    hasLoadedOptions: false,
    emsFileOptions: [],
    selectedOption: null,
  };

  _loadFileOptions = async () => {
    // @ts-ignore
    const emsClient = getEMSClient();
    // @ts-ignore
    const fileLayers: unknown[] = await emsClient.getFileLayers();
    const options = fileLayers.map((fileLayer) => {
      return {
        // @ts-ignore
        value: fileLayer.getId(),
        // @ts-ignore
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

    this.setState({ selectedOption: selectedOptions[0] });

    const emsFileId = selectedOptions[0].value;
    this.props.onSourceConfigChange({ id: emsFileId });
  };

  render() {
    if (!this.state.hasLoadedOptions) {
      // TODO display loading message
      return null;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.emsFile.layerLabel', {
          defaultMessage: 'Layer',
        })}
        helpText={this.state.emsFileOptions.length === 0 ? getEmsUnavailableMessage() : null}
      >
        <EuiComboBox
          placeholder={i18n.translate('xpack.maps.source.emsFile.selectPlaceholder', {
            defaultMessage: 'Select EMS vector shapes',
          })}
          options={this.state.emsFileOptions}
          selectedOptions={this.state.selectedOption ? [this.state.selectedOption!] : []}
          onChange={this._onChange}
          isClearable={false}
          singleSelection={true}
          isDisabled={this.state.emsFileOptions.length === 0}
          data-test-subj="emsVectorComboBox"
        />
      </EuiFormRow>
    );
  }
}
