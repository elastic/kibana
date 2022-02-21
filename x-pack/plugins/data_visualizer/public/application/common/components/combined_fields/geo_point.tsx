/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { ChangeEvent, Component, Fragment } from 'react';

import {
  EuiFormRow,
  EuiFieldText,
  EuiTextAlign,
  EuiSpacer,
  EuiButton,
  EuiSelect,
  EuiSelectOption,
  EuiFormErrorText,
} from '@elastic/eui';

import { CombinedField } from './types';
import {
  createGeoPointCombinedField,
  isWithinLatRange,
  isWithinLonRange,
  getFieldNames,
  getNameCollisionMsg,
} from './utils';
import { FindFileStructureResponse } from '../../../../../../file_upload/common';

interface Props {
  addCombinedField: (combinedField: CombinedField) => void;
  hasNameCollision: (name: string) => boolean;
  results: FindFileStructureResponse;
}

interface State {
  latField: string;
  lonField: string;
  geoPointField: string;
  geoPointFieldError: string;
  latFields: EuiSelectOption[];
  lonFields: EuiSelectOption[];
  submitError: string;
}

export class GeoPointForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const latFields: EuiSelectOption[] = [{ value: '', text: '' }];
    const lonFields: EuiSelectOption[] = [{ value: '', text: '' }];
    getFieldNames(props.results).forEach((columnName: string) => {
      if (isWithinLatRange(columnName, props.results.field_stats)) {
        latFields.push({ value: columnName, text: columnName });
      }
      if (isWithinLonRange(columnName, props.results.field_stats)) {
        lonFields.push({ value: columnName, text: columnName });
      }
    });

    this.state = {
      latField: '',
      lonField: '',
      geoPointField: '',
      geoPointFieldError: '',
      submitError: '',
      latFields,
      lonFields,
    };
  }

  onLatFieldChange = (e: ChangeEvent<HTMLSelectElement>) => {
    this.setState({ latField: e.target.value });
  };

  onLonFieldChange = (e: ChangeEvent<HTMLSelectElement>) => {
    this.setState({ lonField: e.target.value });
  };

  onGeoPointFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    const geoPointField = e.target.value;
    this.setState({ geoPointField });
    this.hasNameCollision(geoPointField);
  };

  hasNameCollision = debounce((name: string) => {
    try {
      const geoPointFieldError = this.props.hasNameCollision(name) ? getNameCollisionMsg(name) : '';
      this.setState({ geoPointFieldError });
    } catch (error) {
      this.setState({ submitError: error.message });
    }
  }, 200);

  onSubmit = () => {
    try {
      this.props.addCombinedField(
        createGeoPointCombinedField(
          this.state.latField,
          this.state.lonField,
          this.state.geoPointField
        )
      );
      this.setState({ submitError: '' });
    } catch (error) {
      this.setState({ submitError: error.message });
    }
  };

  render() {
    let error;
    if (this.state.submitError) {
      error = <EuiFormErrorText>{this.state.submitError}</EuiFormErrorText>;
    }
    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.dataVisualizer.file.geoPointForm.latFieldLabel', {
            defaultMessage: 'Latitude field',
          })}
        >
          <EuiSelect
            options={this.state.latFields}
            value={this.state.latField}
            onChange={this.onLatFieldChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.dataVisualizer.file.geoPointForm.lonFieldLabel', {
            defaultMessage: 'Longitude field',
          })}
        >
          <EuiSelect
            options={this.state.lonFields}
            value={this.state.lonField}
            onChange={this.onLonFieldChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.dataVisualizer.file.geoPointForm.geoPointFieldLabel', {
            defaultMessage: 'Geo point field',
          })}
          isInvalid={this.state.geoPointFieldError !== ''}
          error={[this.state.geoPointFieldError]}
        >
          <EuiFieldText
            value={this.state.geoPointField}
            onChange={this.onGeoPointFieldChange}
            isInvalid={this.state.geoPointFieldError !== ''}
            aria-label={i18n.translate(
              'xpack.dataVisualizer.file.geoPointForm.geoPointFieldAriaLabel',
              {
                defaultMessage: 'Geo point field, required field',
              }
            )}
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        {error}

        <EuiTextAlign textAlign="right">
          <EuiButton
            size="s"
            fill
            disabled={
              !this.state.latField ||
              !this.state.lonField ||
              !this.state.geoPointField ||
              this.state.geoPointFieldError !== ''
            }
            onClick={this.onSubmit}
          >
            <FormattedMessage
              id="xpack.dataVisualizer.file.geoPointForm.submitButtonLabel"
              defaultMessage="Add"
            />
          </EuiButton>
        </EuiTextAlign>
      </Fragment>
    );
  }
}
