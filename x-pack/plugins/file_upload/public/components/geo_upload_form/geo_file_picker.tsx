/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiFilePicker, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MB } from '../../../common/constants';
import { getMaxBytesFormatted } from '../../importer/get_max_bytes';
import { GEO_FILE_TYPES, geoImporterFactory } from '../../importer/geo';
import type { GeoFileImporter, GeoFilePreview } from '../../importer/geo'; 

export type OnFileSelectParameters = GeoFilePreview & {
  indexName: string;
  importer: GeoFileImporter;
};

interface Props {
  onSelect: (onFileSelectParameters: OnFileSelectParameters) => void;
  onClear: () => void;
}

interface State {
  error: string | null;
  isLoadingPreview: boolean;
  previewSummary: string | null;
}

export class GeoFilePicker extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    error: null,
    isLoadingPreview: false,
    previewSummary: null,
  };

  async componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onFileSelect = (files: FileList | null) => {
    this.props.onClear();

    this.setState({
      error: null,
      isLoadingPreview: false,
      previewSummary: null,
    });

    if (files && files.length) {
      this._loadFilePreview(files[0]);
    }
  };

  async _loadFilePreview(file: File) {
    this.setState({ isLoadingPreview: true });

    let importer: GeoFileImporter | null = null;
    let previewError: string | null = null;
    let preview: GeoFilePreview | null = null;
    try {
      importer = geoImporterFactory(file);
      preview = await importer.previewFile(10000, MB * 3);
      if (preview.features.length === 0) {
        previewError = i18n.translate('xpack.fileUpload.geoFilePicker.noFeaturesDetected', {
          defaultMessage: 'No features found in selected file.',
        });
      }
    } catch (error) {
      previewError = error.message;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      error: previewError,
      isLoadingPreview: false,
      previewSummary:
        !previewError && preview
          ? i18n.translate('xpack.fileUpload.geoFilePicker.previewSummary', {
              defaultMessage: 'Previewing {numFeatures} features, {previewCoverage}% of file.',
              values: {
                numFeatures: preview.features.length,
                previewCoverage: preview.previewCoverage,
              },
            })
          : null,
    });

    if (importer && preview) {
      this.props.onSelect({
        ...preview,
        importer,
        indexName: file.name.split('.')[0].toLowerCase(),
      });
    }
  }

  _renderHelpText() {
    return this.state.previewSummary !== null ? (
      this.state.previewSummary
    ) : (
      <span>
        {i18n.translate('xpack.fileUpload.geoFilePicker.acceptedFormats', {
          defaultMessage: 'Formats accepted: {fileTypes}',
          values: { fileTypes: GEO_FILE_TYPES.join(', ') },
        })}
        <br />
        {i18n.translate('xpack.fileUpload.geoFilePicker.maxSize', {
          defaultMessage: 'Max size: {maxFileSize}',
          values: { maxFileSize: getMaxBytesFormatted() },
        })}
        <br />
        {i18n.translate('xpack.fileUpload.geoFilePicker.acceptedCoordinateSystem', {
          defaultMessage: 'Coordinates must be in EPSG:4326 coordinate reference system.',
        })}
      </span>
    );
  }

  render() {
    return (
      <EuiFormRow
        isInvalid={!!this.state.error}
        error={!!this.state.error ? [this.state.error] : []}
        helpText={this._renderHelpText()}
      >
        <EuiFilePicker
          initialPromptText={i18n.translate('xpack.fileUpload.geoFilePicker.filePicker', {
            defaultMessage: 'Select or drag and drop a file',
          })}
          onChange={this._onFileSelect}
          accept={GEO_FILE_TYPES.join(',')}
          isLoading={this.state.isLoadingPreview}
        />
      </EuiFormRow>
    );
  }
}
