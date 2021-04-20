/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import { EuiFormRow, EuiFieldText, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getExistingIndexNames,
  getExistingIndexPatternNames,
  checkIndexPatternValid,
  // @ts-expect-error
} from '../../util/indexing_service';

export interface Props {
  indexName: string; // Allow setting index pattern from external source
  onIndexNameChange?: (name: string, error?: string) => void;
}

interface State {
  existingIndexNames: string[];
  indexName: string;
  indexNameError: string | undefined;
}

export class IndexNameForm extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    existingIndexNames: [],
    indexName: '',
    indexNameError: '',
  };

  async componentDidMount() {
    this._isMounted = true;
    this._loadExistingIndexNames();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps: Props) {
    const { indexName: prevIndexName } = prevProps;
    const { indexName } = this.props;
    if (indexName !== prevIndexName && indexName !== this.state.indexName) {
      this.setState({ indexName });
      this._onIndexNameChange(indexName);
    }
  }

  _loadExistingIndexNames = async () => {
    const indexNameList = await getExistingIndexNames();
    const indexPatternList = await getExistingIndexPatternNames();
    if (this._isMounted) {
      this.setState({
        existingIndexNames: [...indexNameList, ...indexPatternList],
      });
    }
  };

  _onIndexNameChange = (indexName: string) => {
    let indexNameError: string | undefined;
    if (this.state.existingIndexNames.includes(indexName)) {
      indexNameError = i18n.translate(
        'xpack.fileUpload.indexNameForm.indexNameAlreadyExistsErrorMessage',
        {
          defaultMessage: 'Index name already exists.',
        }
      );
    } else if (!checkIndexPatternValid(indexName)) {
      indexNameError = i18n.translate(
        'xpack.fileUpload.indexNameForm.indexNameContainsIllegalCharactersErrorMessage',
        {
          defaultMessage: 'Index name contains illegal characters.',
        }
      );
    }

    this.setState({ indexName, indexNameError });
    if (this.props.onIndexNameChange) {
      this.props.onIndexNameChange(indexName, indexNameError);
    }
  };

  _onIndexNameChangeEvent = (event: ChangeEvent<HTMLInputElement>) => {
    this._onIndexNameChange(event.target.value);
  };

  render() {
    const errors = [...(this.state.indexNameError ? [this.state.indexNameError] : [])];

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
            value={this.state.indexName}
            onChange={this._onIndexNameChangeEvent}
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
