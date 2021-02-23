/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiFilePicker, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MB } from '../../common';
import { getMaxBytes, getMaxBytesFormatted } from '../get_max_bytes';
import { GeoJsonImporter, GEOJSON_FILE_TYPES } from '../importer/geojson_importer';

interface Props {
  onSelect: ({
    features,
    geoFieldTypes,
    importer,
    indexName,
  }: {
    features: Feature[];
    indexName: string;
    importer: Importer;
    geoFieldTypes: string[];
  }) => void;
  onClear: () => void;
}

interface State {
  error: string | null;
  isLoadingPreview: boolean;
  previewSummary: string | null;
}

export class GeoJsonFilePicker extends Component<Props, State> {
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

  _onFileSelect = async (files: FileList) => {
    this.props.onClear();

    this.setState({
      error: null,
      isLoadingPreview: false,
      previewSummary: null,
    });

    if (files.length === 0) {
      return;
    }

    const file = files[0];
    this.setState({ isLoadingPreview: true });

    let importer: GeoJsonImporter;
    let previewError: string | null = null;
    let preview: { features: Feature[]; geoFieldTypes: string[]; previewCoverage: number };
    try {
      importer = new GeoJsonImporter(file);
      preview = await importer.previewFile(10000, MB * 3);
      if (preview.features.length === 0) {
        previewError = i18n.translate('xpack.fileUpload.geojsonFilePicker.noFeaturesDetected', {
          defaultMessage: 'No GeoJson features found in selected file.',
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
        previewError === null
          ? i18n.translate('xpack.fileUpload.geojsonFilePicker.previewSummary', {
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
        indexName: file.name.split('.')[0],
      });
    }
  };

  _renderHelpText() {
    return this.state.previewSummary !== null ? (
      this.state.previewSummary
    ) : (
      <span>
        {i18n.translate('xpack.fileUpload.geojsonFilePicker.acceptedFormats', {
          defaultMessage: 'Formats accepted: {fileTypes}',
          values: { fileTypes: GEOJSON_FILE_TYPES.join(', ') },
        })}
        <br />
        {i18n.translate('xpack.fileUpload.geojsonFilePicker.maxSize', {
          defaultMessage: 'Max size: {maxFileSize}',
          values: { maxFileSize: getMaxBytesFormatted() },
        })}
        <br />
        {i18n.translate('xpack.fileUpload.geojsonFilePicker.acceptedCoordinateSystem', {
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
          initialPromptText={i18n.translate('xpack.fileUpload.geojsonFilePicker.filePicker', {
            defaultMessage: 'Select or drag and drop a file',
          })}
          onChange={this._onFileSelect}
          accept={GEOJSON_FILE_TYPES.join(',')}
          isLoading={this.state.isLoadingPreview}
        />
      </EuiFormRow>
    );
  }
}
