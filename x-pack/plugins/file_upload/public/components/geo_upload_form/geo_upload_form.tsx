/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiSelect,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { GeoFilePicker, OnFileSelectParameters } from './geo_file_picker';
import { IndexNameForm } from './index_name_form';
import { validateIndexName } from '../../validate_index_name';
import { UPLOAD_SIZE } from '../../importer/geo';

const UPLOAD_SIZE_OPTIONS = [
  {
    text: i18n.translate('xpack.fileUpload.uploadSize.normalLabel', {
      defaultMessage: 'Normal',
    }),
    value: UPLOAD_SIZE.NORMAL,
  },
  {
    text: i18n.translate('xpack.fileUpload.uploadSize.smallLabel', {
      defaultMessage: 'Small',
    }),
    value: UPLOAD_SIZE.SMALL,
  },
]

const GEO_FIELD_TYPE_OPTIONS = [
  {
    text: ES_FIELD_TYPES.GEO_POINT,
    value: ES_FIELD_TYPES.GEO_POINT,
  },
  {
    text: ES_FIELD_TYPES.GEO_SHAPE,
    value: ES_FIELD_TYPES.GEO_SHAPE,
  },
];

interface Props {
  geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE;
  indexName: string;
  indexNameError?: string;
  uploadSize: UPLOAD_SIZE;
  onFileClear: () => void;
  onFileSelect: (onFileSelectParameters: OnFileSelectParameters) => void;
  onGeoFieldTypeSelect: (geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) => void;
  onIndexNameChange: (name: string, error?: string) => void;
  onIndexNameValidationStart: () => void;
  onIndexNameValidationEnd: () => void;
  onUploadSizeChange: (uploadSize: UPLOAD_SIZE) => void;
}

interface State {
  hasFile: boolean;
  isPointsOnly: boolean;
}

export class GeoUploadForm extends Component<Props, State> {
  private _isMounted = false;
  state: State = {
    hasFile: false,
    isPointsOnly: false,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onFileSelect = async (onFileSelectParameters: OnFileSelectParameters) => {
    this.setState({
      hasFile: true,
      isPointsOnly: onFileSelectParameters.hasPoints && !onFileSelectParameters.hasShapes,
    });

    this.props.onFileSelect(onFileSelectParameters);

    this.props.onIndexNameValidationStart();
    const indexNameError = await validateIndexName(onFileSelectParameters.indexName);
    if (!this._isMounted) {
      return;
    }
    this.props.onIndexNameValidationEnd();
    this.props.onIndexNameChange(onFileSelectParameters.indexName, indexNameError);

    const geoFieldType =
      onFileSelectParameters.hasPoints && !onFileSelectParameters.hasShapes
        ? ES_FIELD_TYPES.GEO_POINT
        : ES_FIELD_TYPES.GEO_SHAPE;
    this.props.onGeoFieldTypeSelect(geoFieldType);
  };

  _onFileClear = () => {
    this.setState({
      hasFile: false,
      isPointsOnly: false,
    });

    this.props.onFileClear();

    this.props.onIndexNameChange('');
  };

  _onGeoFieldTypeSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    return this.props.onGeoFieldTypeSelect(
      event.target.value as ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE
    );
  };

  _onUploadSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    return this.props.onUploadSizeChange(
      event.target.value as UPLOAD_SIZE
    );
  };

  _renderGeoFieldTypeSelect() {
    return this.state.hasFile && this.state.isPointsOnly ? (
      <EuiFormRow
        label={i18n.translate('xpack.fileUpload.indexSettings.enterIndexTypeLabel', {
          defaultMessage: 'Index type',
        })}
      >
        <EuiSelect
          data-test-subj="fileImportIndexSelect"
          options={GEO_FIELD_TYPE_OPTIONS}
          value={this.props.geoFieldType}
          onChange={this._onGeoFieldTypeSelect}
        />
      </EuiFormRow>
    ) : null;
  }

  render() {
    return (
      <EuiForm>
        <GeoFilePicker onSelect={this._onFileSelect} onClear={this._onFileClear} />
        {this._renderGeoFieldTypeSelect()}
        {this.state.hasFile ? (
          <>
            <IndexNameForm
              indexName={this.props.indexName}
              indexNameError={this.props.indexNameError}
              onIndexNameChange={this.props.onIndexNameChange}
              onIndexNameValidationStart={this.props.onIndexNameValidationStart}
              onIndexNameValidationEnd={this.props.onIndexNameValidationEnd}
            />
            <EuiSpacer size="m" />
            <EuiFormRow
              label={
                <EuiToolTip
                  anchorClassName="eui-alignMiddle"
                  content={i18n.translate('xpack.fileUpload.uploadSize.tooltip', {
                    defaultMessage: 'Use small upload size to alleviate request timeout failures.',
                  })}
                >
                  <span>
                    {i18n.translate('xpack.fileUpload.uploadSize.label', {
                      defaultMessage: 'Upload size',
                    })}{' '}
                    <EuiIcon type="questionInCircle" color="subdued" />
                  </span>
                </EuiToolTip>
              }
            >
              <EuiSelect
                options={UPLOAD_SIZE_OPTIONS}
                value={this.props.uploadSize}
                onChange={this._onUploadSizeChange}
              />
            </EuiFormRow>
          </>
        ) : null}
      </EuiForm>
    );
  }
}
