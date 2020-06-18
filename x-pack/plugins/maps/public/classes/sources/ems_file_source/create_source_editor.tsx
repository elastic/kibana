/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers } from '../../../meta';
import { getEmsUnavailableMessage } from '../ems_unavailable_message';
import { EMSFileSourceDescriptor } from '../../../../common/descriptor_types';
import { EMSFileSelect } from '../../../components/ems_file_select';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<EMSFileSourceDescriptor>) => void;
}

interface State {
  emsFileId: string | null;
}

export class EMSFileCreateSourceEditor extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    emsFileId: null,
  };

  _onChange = (emsFileId: string) => {
    this.setState({ emsFileId });
    this.props.onSourceConfigChange({ id: emsFileId });
  };

  render() {
    return <EMSFileSelect value={this.state.emsFileId} onChange={this._onChange} />;
  }
}
