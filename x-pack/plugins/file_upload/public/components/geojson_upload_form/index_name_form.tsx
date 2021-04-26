/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import { EuiFormRow, EuiFieldText, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { validateIndexName } from '../../util/indexing_service';

export interface Props {
  indexName: string;
  indexNameError?: string;
  onIndexNameChange: (name: string, error?: string) => void;
}

export class IndexNameForm extends Component<Props> {
  _onIndexNameChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const indexName = event.target.value;
    const indexNameError = await validateIndexName(indexName);
    this.props.onIndexNameChange(indexName, indexNameError);
  };

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
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.translate('xpack.fileUpload.indexNameForm.indexNameGuidelines', {
            defaultMessage: 'Index name guidelines',
          })}
          size="s"
        >
          <ul style={{ marginBottom: 0 }}>
            <li>
              {i18n.translate('xpack.fileUpload.indexNameForm.guidelines.mustBeNewIndex', {
                defaultMessage: 'Must be a new index',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexNameForm.guidelines.lowercaseOnly', {
                defaultMessage: 'Lowercase only',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexNameForm.guidelines.cannotInclude', {
                defaultMessage:
                  'Cannot include \\\\, /, *, ?, ", <, >, |, \
                  " " (space character), , (comma), #',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexNameForm.guidelines.cannotStartWith', {
                defaultMessage: 'Cannot start with -, _, +',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexNameForm.guidelines.cannotBe', {
                defaultMessage: 'Cannot be . or ..',
              })}
            </li>
            <li>
              {i18n.translate('xpack.fileUpload.indexNameForm.guidelines.length', {
                defaultMessage:
                  'Cannot be longer than 255 bytes (note it is bytes, \
                  so multi-byte characters will count towards the 255 \
                  limit faster)',
              })}
            </li>
          </ul>
        </EuiCallOut>
      </>
    );
  }
}
