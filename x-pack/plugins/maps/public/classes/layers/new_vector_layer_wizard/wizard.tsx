/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { EuiEmptyPrompt, EuiPanel, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createNewIndexAndPattern } from './create_new_index_pattern';
import { RenderWizardArguments } from '../layer_wizard_registry';
import { VectorLayer } from '../vector_layer';
import { ESSearchSource } from '../../sources/es_search_source';
import { ADD_LAYER_STEP_ID } from '../../../connected_components/add_layer_panel/view';
import { getIndexNameFormComponent } from '../../../kibana_services';

interface State {
  indexName: string;
  indexNameError: string;
  indexingTriggered: boolean;
  createIndexError: string;
}

export class NewVectorLayerEditor extends Component<RenderWizardArguments, State> {
  private _isMounted: boolean = false;

  state: State = {
    indexName: '',
    indexNameError: '',
    indexingTriggered: false,
    createIndexError: '',
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidUpdate() {
    if (this.props.currentStepId === ADD_LAYER_STEP_ID && !this.state.indexingTriggered) {
      this.setState({ indexingTriggered: true });
      await this._createNewIndex();
    }
  }

  _setCreateIndexError(errorMessage: string) {
    if (!this._isMounted) {
      return;
    }
    this.setState({
      createIndexError: errorMessage,
    });
  }

  _createNewIndex = async () => {
    let indexPatternId: string | undefined;
    try {
      const response = await createNewIndexAndPattern(this.state.indexName);
      indexPatternId = response.indexPatternId;
    } catch (e) {
      this._setCreateIndexError(e.message);
      return;
    }

    if (!indexPatternId) {
      this._setCreateIndexError(
        i18n.translate('xpack.maps.layers.newVectorLayerWizard.createIndexError', {
          defaultMessage: 'Could not create index with name {message}',
          values: {
            message: this.state.indexName,
          },
        })
      );
      return;
    }

    if (!this._isMounted) {
      return;
    }
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
    this.props.advanceToNextStep();
  };

  _onIndexChange = (indexName: string, indexError?: string) => {
    this.setState({
      indexName,
      indexNameError: indexError ? indexError : '',
    });
    if (indexName && !indexError) {
      this.props.enableNextBtn();
    } else {
      this.props.disableNextBtn();
    }
  };

  render() {
    if (this.state.createIndexError) {
      return (
        <EuiCallOut
          title={i18n.translate('xpack.maps.layers.newVectorLayerWizard.createIndexErrorTitle', {
            defaultMessage: 'Sorry, could not create index pattern',
          })}
          color="danger"
          iconType="alert"
        >
          <p>{this.state.createIndexError}</p>
        </EuiCallOut>
      );
    }

    const IndexNameForm = getIndexNameFormComponent();
    return (
      <EuiPanel>
        <>
          <EuiEmptyPrompt
            title={
              <h4>
                {i18n.translate('xpack.maps.layers.newVectorLayerWizard.createNewLayer', {
                  defaultMessage: 'Create new layer',
                })}
              </h4>
            }
            body={
              <Fragment>
                <p>
                  {i18n.translate(
                    'xpack.maps.layers.newVectorLayerWizard.vectorEditorDescription',
                    {
                      defaultMessage: `Creates a new vector layer. This can be used to draw and store new shapes.`,
                    }
                  )}
                </p>
              </Fragment>
            }
          />
          <IndexNameForm
            indexName={this.state.indexName}
            indexNameError={this.state.indexNameError}
            onIndexNameChange={this._onIndexChange}
            onIndexNameValidationStart={() => {}}
            onIndexNameValidationEnd={() => {}}
          />
        </>
      </EuiPanel>
    );
  }
}
