/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import { EuiFormRow, EuiFieldText, EuiSpacer, CommonProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { validateIndexName } from '../../validate_index_name';

export interface Props {
  indexName: string;
  indexNameError?: string;
  onIndexNameChange: (name: string, error: string) => void;
  onIndexNameValidationStart: () => void;
  onIndexNameValidationEnd: () => void;
}

export class IndexNameForm extends Component<CommonProps & Props> {
  private _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onIndexNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const indexName = event.target.value;
    this.props.onIndexNameChange(indexName, '');
    this._validateIndexName(indexName);
    this.props.onIndexNameValidationStart();
  };

  _validateIndexName = _.debounce(async (indexName: string) => {
    const indexNameError = await validateIndexName(indexName);
    if (!this._isMounted || indexName !== this.props.indexName) {
      return;
    }
    this.props.onIndexNameValidationEnd();
    this.props.onIndexNameChange(indexName, indexNameError ? indexNameError : '');
  }, 500);

  render() {
    const errors = [...(this.props.indexNameError ? [this.props.indexNameError] : [])];

    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.fileUpload.indexNameForm.enterIndexNameLabel', {
            defaultMessage: 'Index name',
          })}
          isInvalid={!!errors.length}
          error={errors}
        >
          <EuiFieldText
            data-test-subj="fileUploadIndexNameInput"
            value={this.props.indexName}
            onChange={this._onIndexNameChange}
            isInvalid={!!errors.length}
            aria-label={i18n.translate('xpack.fileUpload.indexNameForm.indexNameReqField', {
              defaultMessage: 'Index name, required field',
            })}
            {...this.props}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
      </>
    );
  }
}
