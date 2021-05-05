/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createNewIndexAndPattern } from './utils/indexing_service';
import { RenderWizardArguments } from '../layer_wizard_registry';
import { VectorLayer } from '../vector_layer';
import { ESSearchSource } from '../../sources/es_search_source';
import { ADD_LAYER_STEP_ID } from '../../../connected_components/add_layer_panel/view';
import { getIndexNameFormComponent } from '../../../kibana_services';

interface State {
  indexName: string;
  indexError: string;
  indexingTriggered: boolean;
  indexPatternId: string;
}

export class NewVectorLayerEditor extends Component<RenderWizardArguments, State> {
  private _isMounted: boolean = false;

  state: State = {
    indexName: '',
    indexError: '',
    indexingTriggered: false,
    indexPatternId: '',
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
      if (!this._isMounted) {
        return;
      }
      this.props.advanceToNextStep();
    }
  }

  _createNewIndex = async () => {
    const { indexPatternId } = await createNewIndexAndPattern(this.state.indexName);
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
  };

  _onIndexChange = (indexName: string, indexError?: string) => {
    this.setState({
      indexName,
      ...(indexError ? { indexError } : { indexError: '' }),
    })
    if (indexName && !indexError) {
      this.props.enableNextBtn();
    } else {
      this.props.disableNextBtn();
    }
  };

  render() {
    const IndexNameForm = getIndexNameFormComponent();
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
                      defaultMessage: `Use the editor on the left to draw your points and shapes.`,
                    }
                  )}
                </p>
              </Fragment>
            }
          />
          <IndexNameForm
            indexName={this.state.indexName}
            indexNameError={this.state.indexError}
            onIndexNameChange={this._onIndexChange}
          />
        </>
      </EuiPanel>
    );
  }
}
