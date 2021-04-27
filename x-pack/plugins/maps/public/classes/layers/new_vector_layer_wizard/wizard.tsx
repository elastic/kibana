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
import { getFileUpload } from '../../../kibana_services';
import { RenderWizardArguments } from '../layer_wizard_registry';
import { VectorLayer } from '../vector_layer';
import { ESSearchSource } from '../../sources/es_search_source';
import { ADD_LAYER_STEP_ID } from '../../../connected_components/add_layer_panel/view';
import { IndexNameFormProps } from '../../../../../file_upload/public';

export const ADD_VECTOR_DRAWING_LAYER = 'ADD_VECTOR_DRAWING_LAYER';

interface State {
  indexName: string;
  indexError: string;
  indexingTriggered: boolean;
  indexPatternId: string;
  indexNameFormComponent: React.ComponentType<IndexNameFormProps> | null;
}

export class NewVectorLayerEditor extends Component<RenderWizardArguments, State> {
  state: State = {
    indexName: '',
    indexError: '',
    indexingTriggered: false,
    indexPatternId: '',
    indexNameFormComponent: null,
  };

  componentDidMount() {
    this._loadIndexNameFormComponent();
  }

  async _loadIndexNameFormComponent() {
    this.setState({
      indexNameFormComponent: await getFileUpload().getIndexNameFormComponent(),
    });
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

  render() {
    if (!this.state.indexNameFormComponent) {
      return null;
    }
    const IndexNameForm = this.state.indexNameFormComponent;
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
            onIndexNameChange={(indexName, indexError) => {
              this.setState({
                indexName,
                ...(indexError ? { indexError } : { indexError: '' }),
              });
            }}
          />
        </>
      </EuiPanel>
    );
  }
}
