/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component, Fragment } from 'react';
import { EuiEmptyPrompt, EuiFieldText, EuiFormRow, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getExistingIndexNames,
  getExistingIndexPatternNames,
  checkIndexPatternValid,
  createNewIndexAndPattern,
} from './utils/indexing_service';
import { RenderWizardArguments } from '../layer_wizard_registry';
import { VectorLayer } from '../vector_layer';
import { ESSearchSource } from '../../sources/es_search_source';
import { IndexEntryDescription } from './index_entry_description';
import { ADD_LAYER_STEP_ID } from '../../../connected_components/add_layer_panel/view';

export const ADD_VECTOR_DRAWING_LAYER = 'ADD_VECTOR_DRAWING_LAYER';

interface State {
  indexName: string;
  indexError: string;
  currentIndexNames: string[];
  indexingTriggered: boolean;
  indexPatternId: string;
}

export class NewVectorLayerEditor extends Component<RenderWizardArguments, State> {
  state: State = {
    indexName: '',
    indexError: '',
    currentIndexNames: [],
    indexingTriggered: false,
    indexPatternId: '',
  };

  private _isMounted = false;

  async componentDidMount() {
    this._isMounted = true;
    this._loadcurrentIndexNames();
  }

  async componentDidUpdate() {
    const { enableNextBtn, disableNextBtn } = this.props;
    if (this.state.indexName && !this.state.indexError) {
      enableNextBtn();
    } else {
      disableNextBtn();
    }
    if (this.props.currentStepId === ADD_LAYER_STEP_ID && !this.state.indexingTriggered) {
      this.setState({ indexingTriggered: true });
      await this._createNewIndex();
      this.props.advanceToNextStep();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _createNewIndex = async () => {
    const { indexPatternId } = await createNewIndexAndPattern(this.state.indexName);
    // Creates empty layer
    const sourceDescriptor = ESSearchSource.createDescriptor({
      indexPatternId,
      geoField: 'coordinates',
      filterByMapBounds: false,
    });
    const layerDescriptor = VectorLayer.createDescriptor(
      { sourceDescriptor },
      this.props.mapColors
    );
    this.props.previewLayers([layerDescriptor]);
  };

  _loadcurrentIndexNames = async () => {
    const indexNameList = await getExistingIndexNames();
    const indexPatternList = await getExistingIndexPatternNames();
    if (this._isMounted) {
      this.setState({
        currentIndexNames: [...indexNameList, ...indexPatternList],
      });
    }
  };

  _onIndexNameChange = () => {
    if (this.state.currentIndexNames.includes(this.state.indexName)) {
      this.setState({
        indexError: i18n.translate(
          'xpack.maps.layers.newVectorLayerWizard.indexSettings.indexNameAlreadyExistsErrorMessage',
          {
            defaultMessage: 'Index name already exists.',
          }
        ),
      });
    } else if (!checkIndexPatternValid(this.state.indexName)) {
      this.setState({
        indexError: i18n.translate(
          'xpack.maps.layers.newVectorLayerWizard.indexSettings.indexNameContainsIllegalCharactersErrorMessage',
          {
            defaultMessage: 'Index name contains illegal characters.',
          }
        ),
      });
    } else {
      this.setState({ indexError: '' });
    }
  };

  _onIndexNameChangeEvent = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ indexName: event.target.value }, this._onIndexNameChange);
  };

  render() {
    return (
      <EuiPanel>
        <>
          <EuiEmptyPrompt
            title={
              <h4>
                {i18n.translate('xpack.maps.layers.newVectorLayerWizard.drawVectorShapes', {
                  defaultMessage: 'Draw shapes',
                })}
              </h4>
            }
            body={
              <Fragment>
                <p>
                  {i18n.translate(
                    'xpack.maps.layers.newVectorLayerWizard.vectorEditorDescription',
                    {
                      defaultMessage: `Use the editor on the left to draw your points and shapes`,
                    }
                  )}
                </p>
              </Fragment>
            }
          />
          <EuiFormRow
            label={i18n.translate(
              'xpack.maps.layers.newVectorLayerWizard.indexSettings.enterIndexNameLabel',
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
              aria-label={i18n.translate(
                'xpack.maps.layers.newVectorLayerWizard.indexNameReqField',
                {
                  defaultMessage: 'Index name, required field',
                }
              )}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          {IndexEntryDescription()}
        </>
      </EuiPanel>
    );
  }
}
