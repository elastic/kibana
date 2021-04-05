/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component, Fragment } from 'react';
import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getExistingIndexNames,
  getExistingIndexPatternNames,
  checkIndexPatternValid,
  // @ts-expect-error
} from './utils/indexing_service';

interface Props {
  setEditModeActive: () => void;
  setEditModeInActive: () => void;
  setIndexName: (indexName: string) => void;
}

interface State {
  indexName: string;
  indexError: string;
  indexNames: string[];
}

export class NewVectorLayerEditor extends Component<Props, State> {
  state = {
    indexName: '',
    indexError: '',
    indexNames: [],
  };

  private _isMounted = false;

  async componentDidMount() {
    this.props.setEditModeActive();
    this._isMounted = true;
    this._loadIndexNames();
  }

  componentWillUnmount() {
    this.props.setEditModeInActive();
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

  _onIndexNameChange = (indexName: string) => {
    if (this.state.indexNames.includes(indexName)) {
      this.setState({
        indexError: i18n.translate(
          'xpack.layers.newVectorLayerWizard.indexSettings.indexNameAlreadyExistsErrorMessage',
          {
            defaultMessage: 'Index name already exists.',
          }
        ),
      });
    } else if (!checkIndexPatternValid(indexName)) {
      this.setState({
        indexError: i18n.translate(
          'xpack.layers.newVectorLayerWizard.indexSettings.indexNameContainsIllegalCharactersErrorMessage',
          {
            defaultMessage: 'Index name contains illegal characters.',
          }
        ),
      });
    } else {
      this.setState({ indexError: '' });
      this.props.setIndexName(indexName);
    }
  };

  _onIndexNameChangeEvent = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ indexName: event.target.value });
    this._onIndexNameChange(event.target.value);
  };

  render() {
    return (
      <EuiPanel>
        <>
          <EuiEmptyPrompt
            title={
              <h4>
                {i18n.translate('xpack.layers.newVectorLayerWizard.drawVectorShapes', {
                  defaultMessage: 'Draw vector shapes',
                })}
              </h4>
            }
            body={
              <Fragment>
                <p>
                  {i18n.translate('xpack.layers.newVectorLayerWizard.vectorEditorDescription', {
                    defaultMessage: `Using the editor on the left side of the map, draw and edit the points and shapes to be indexed and added to the map.`,
                  })}
                </p>
              </Fragment>
            }
          />
          <EuiFormRow
            label={i18n.translate(
              'xpack.layers.newVectorLayerWizard.indexSettings.enterIndexNameLabel',
              {
                defaultMessage: 'Index name',
              }
            )}
            isInvalid={!!this.state.indexError}
            error={!!this.state.indexError ? [this.state.indexError] : []}
          >
            <EuiFieldText
              data-test-subj="fileUploadIndexNameInput"
              value={this.state.indexName}
              onChange={this._onIndexNameChangeEvent}
              isInvalid={!!this.state.indexError}
              aria-label={i18n.translate('xpack.layers.newVectorLayerWizard.indexNameReqField', {
                defaultMessage: 'Index name, required field',
              })}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.layers.newVectorLayerWizard.indexSettings.indexNameGuidelines',
              {
                defaultMessage: 'Index name guidelines',
              }
            )}
            size="s"
          >
            <ul style={{ marginBottom: 0 }}>
              <li>
                {i18n.translate(
                  'xpack.layers.newVectorLayerWizard.indexSettings.guidelines.mustBeNewIndex',
                  {
                    defaultMessage: 'Must be a new index',
                  }
                )}
              </li>
              <li>
                {i18n.translate(
                  'xpack.layers.newVectorLayerWizard.indexSettings.guidelines.lowercaseOnly',
                  {
                    defaultMessage: 'Lowercase only',
                  }
                )}
              </li>
              <li>
                {i18n.translate(
                  'xpack.layers.newVectorLayerWizard.indexSettings.guidelines.cannotInclude',
                  {
                    defaultMessage:
                      'Cannot include \\\\, /, *, ?, ", <, >, |, \
                  " " (space character), , (comma), #',
                  }
                )}
              </li>
              <li>
                {i18n.translate(
                  'xpack.layers.newVectorLayerWizard.indexSettings.guidelines.cannotStartWith',
                  {
                    defaultMessage: 'Cannot start with -, _, +',
                  }
                )}
              </li>
              <li>
                {i18n.translate(
                  'xpack.layers.newVectorLayerWizard.indexSettings.guidelines.cannotBe',
                  {
                    defaultMessage: 'Cannot be . or ..',
                  }
                )}
              </li>
              <li>
                {i18n.translate(
                  'xpack.layers.newVectorLayerWizard.indexSettings.guidelines.length',
                  {
                    defaultMessage:
                      'Cannot be longer than 255 bytes (note it is bytes, \
                  so multi-byte characters will count towards the 255 \
                  limit faster)',
                  }
                )}
              </li>
            </ul>
          </EuiCallOut>
        </>
      </EuiPanel>
    );
  }
}
