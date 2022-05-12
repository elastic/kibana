/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFilePicker, EuiFormRow } from '@elastic/eui';

export function getFileNameWithoutExt(fileName: string) {
  const splits = fileName.split('.');
  if (splits.length > 1) {
    splits.pop();
  }
  return splits.join('.');
}

interface Props {
  ext: '.dbf' | '.prj' | '.shx';
  onSelect: (file: File | null) => void;
  shapefileName: string;
}

interface State {
  error: string;
  isInvalid: boolean;
}

export class SideCarFilePicker extends Component<Props, State> {
  state: State = {
    error: '',
    isInvalid: false,
  };

  _isSideCarFileValid(sideCarFile: File) {
    return (
      getFileNameWithoutExt(this.props.shapefileName) === getFileNameWithoutExt(sideCarFile.name)
    );
  }

  _getSideCarFileNameError() {
    return i18n.translate('xpack.fileUpload.shapefile.sideCarFilePicker.error', {
      defaultMessage: '{ext} expected to be {shapefileName}{ext}',
      values: {
        ext: this.props.ext,
        shapefileName: getFileNameWithoutExt(this.props.shapefileName),
      },
    });
  }

  _onSelect = (files: FileList | null) => {
    if (!files || files.length === 0) {
      this.setState({ error: '', isInvalid: false });
      this.props.onSelect(null);
      return;
    }

    const file = files[0];
    if (!this._isSideCarFileValid(file)) {
      this.setState({ error: this._getSideCarFileNameError(), isInvalid: true });
      this.props.onSelect(null);
      return;
    }

    this.setState({ error: '', isInvalid: false });
    this.props.onSelect(file);
  };

  render() {
    return (
      <EuiFormRow isInvalid={this.state.isInvalid} error={this.state.error}>
        <EuiFilePicker
          initialPromptText={i18n.translate(
            'xpack.fileUpload.shapefile.sideCarFilePicker.promptText',
            {
              defaultMessage: `Select '{ext}' file`,
              values: { ext: this.props.ext },
            }
          )}
          onChange={this._onSelect}
          accept={this.props.ext}
          display="default"
          isInvalid={this.state.isInvalid}
          data-test-subj={`shapefileSideCarFilePicker${this.props.ext.replace('.', '_')}`}
        />
      </EuiFormRow>
    );
  }
}
