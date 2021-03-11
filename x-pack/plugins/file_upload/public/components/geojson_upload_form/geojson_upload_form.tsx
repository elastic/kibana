/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import { EuiForm, EuiFormRow, EuiFieldText, EuiSelect, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GeoJsonFilePicker, OnFileSelectParameters } from './geojson_file_picker';
import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/public';
import {
  getExistingIndexNames,
  getExistingIndexPatternNames,
  checkIndexPatternValid,
  // @ts-expect-error
} from '../../util/indexing_service';

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
  onFileClear: () => void;
  onFileSelect: (onFileSelectParameters: OnFileSelectParameters) => void;
  onGeoFieldTypeSelect: (geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) => void;
  onIndexNameChange: (name: string, error?: string) => void;
}

interface State {
  hasFile: boolean;
  isPointsOnly: boolean;
  indexNames: string[];
}

export class GeoJsonUploadForm extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    hasFile: false,
    isPointsOnly: false,
    indexNames: [],
  };

  async componentDidMount() {
    this._isMounted = true;
    this._loadIndexNames();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadIndexNames = async () => {
    const indexNameList = await getExistingIndexNames();
    const indexPatternList = await getExistingIndexPatternNames();
    if (this._isMounted) {
      this.setState({
        indexNames: [...indexNameList, ...indexPatternList],
      });
    }
  };

  _onFileSelect = (onFileSelectParameters: OnFileSelectParameters) => {
    this.setState({
      hasFile: true,
      isPointsOnly: onFileSelectParameters.hasPoints && !onFileSelectParameters.hasShapes,
    });

    this.props.onFileSelect(onFileSelectParameters);

    this._onIndexNameChange(onFileSelectParameters.indexName);

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

    this._onIndexNameChange('');
  };

  _onGeoFieldTypeSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    return this.props.onGeoFieldTypeSelect(
      event.target.value as ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE
    );
  };

  _onIndexNameChange = (name: string) => {
    let error: string | undefined;
    if (this.state.indexNames.includes(name)) {
      error = i18n.translate('xpack.fileUpload.indexSettings.indexNameAlreadyExistsErrorMessage', {
        defaultMessage: 'Index name already exists.',
      });
    } else if (!checkIndexPatternValid(name)) {
      error = i18n.translate(
        'xpack.fileUpload.indexSettings.indexNameContainsIllegalCharactersErrorMessage',
        {
          defaultMessage: 'Index name contains illegal characters.',
        }
      );
    }

    this.props.onIndexNameChange(name, error);
  };

  _onIndexNameChangeEvent = (event: ChangeEvent<HTMLInputElement>) => {
    this._onIndexNameChange(event.target.value);
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

  _renderIndexNameInput() {
    const isInvalid = this.props.indexNameError !== undefined;
    return this.state.hasFile ? (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.fileUpload.indexSettings.enterIndexNameLabel', {
            defaultMessage: 'Index name',
          })}
          isInvalid={isInvalid}
          error={isInvalid ? [this.props.indexNameError] : []}
        >
          <EuiFieldText
            data-test-subj="fileUploadIndexNameInput"
            value={this.props.indexName}
            onChange={this._onIndexNameChangeEvent}
            isInvalid={isInvalid}
            aria-label={i18n.translate('xpack.fileUpload.indexNameReqField', {
              defaultMessage: 'Index name, required field',
            })}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate('xpack.fileUpload.indexSettings.indexNameGuidelines', {
            defaultMessage: 'Index name guidelines',
          })}
          size="s"
        >
          <ul style={{ marginBottom: 0 }}>
            <li>
              {i18n.translate('xpack.fileUpload.indexSettings.guidelines.mustBeNewIndex', {
                defaultMessage: 'Must be a new index',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexSettings.guidelines.lowercaseOnly', {
                defaultMessage: 'Lowercase only',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexSettings.guidelines.cannotInclude', {
                defaultMessage:
                  'Cannot include \\\\, /, *, ?, ", <, >, |, \
                  " " (space character), , (comma), #',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexSettings.guidelines.cannotStartWith', {
                defaultMessage: 'Cannot start with -, _, +',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexSettings.guidelines.cannotBe', {
                defaultMessage: 'Cannot be . or ..',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexSettings.guidelines.length', {
                defaultMessage:
                  'Cannot be longer than 255 bytes (note it is bytes, \
                  so multi-byte characters will count towards the 255 \
                  limit faster)',
              })}
            </li>
          </ul>
        </EuiCallOut>
      </>
    ) : null;
  }

  render() {
    return (
      <EuiForm>
        <GeoJsonFilePicker onSelect={this._onFileSelect} onClear={this._onFileClear} />
        {this._renderGeoFieldTypeSelect()}
        {this._renderIndexNameInput()}
      </EuiForm>
    );
  }
}
