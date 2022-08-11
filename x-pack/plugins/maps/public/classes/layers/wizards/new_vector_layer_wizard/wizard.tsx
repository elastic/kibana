/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiPanel, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createNewIndexAndPattern } from './create_new_index_pattern';
import { RenderWizardArguments } from '../layer_wizard_registry';
import { GeoJsonVectorLayer } from '../../vector_layer';
import { ESSearchSource } from '../../../sources/es_search_source';
import { ADD_LAYER_STEP_ID } from '../../../../connected_components/add_layer_panel/view';
import { getFileUpload, getIndexNameFormComponent } from '../../../../kibana_services';

interface State {
  indexName: string;
  indexNameError: string;
  indexingTriggered: boolean;
  createIndexError: string;
  userHasIndexWritePermissions: boolean;
}

const DEFAULT_MAPPINGS = {
  created: {
    properties: {
      '@timestamp': {
        type: 'date',
      },
      user: {
        type: 'keyword',
      },
    },
  },
};

export class NewVectorLayerEditor extends Component<RenderWizardArguments, State> {
  private _isMounted: boolean = false;

  state: State = {
    indexName: '',
    indexNameError: '',
    indexingTriggered: false,
    createIndexError: '',
    userHasIndexWritePermissions: true,
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

  _setCreateIndexError(errorMessage: string, userHasIndexWritePermissions: boolean = true) {
    if (!this._isMounted) {
      return;
    }
    this.setState({
      createIndexError: errorMessage,
      userHasIndexWritePermissions,
    });
  }

  async _checkIndexPermissions() {
    return await getFileUpload().hasImportPermission({
      checkCreateDataView: true,
      checkHasManagePipeline: false,
      indexName: this.state.indexName,
    });
  }

  _createNewIndex = async () => {
    let indexPatternId: string | undefined;
    try {
      const userHasIndexWritePermissions = await this._checkIndexPermissions();
      if (!userHasIndexWritePermissions) {
        this._setCreateIndexError(
          i18n.translate('xpack.maps.layers.newVectorLayerWizard.indexPermissionsError', {
            defaultMessage: `You must have 'create' and 'create_index' index privileges to create and write data to "{indexName}".`,
            values: {
              indexName: this.state.indexName,
            },
          }),
          userHasIndexWritePermissions
        );
        return;
      }
      const response = await createNewIndexAndPattern({
        indexName: this.state.indexName,
        defaultMappings: DEFAULT_MAPPINGS,
      });
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
      applyGlobalQuery: false,
    });
    const layerDescriptor = GeoJsonVectorLayer.createDescriptor(
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
      if (!this.state.userHasIndexWritePermissions) {
        return (
          <EuiCallOut
            title={i18n.translate('xpack.maps.layers.newVectorLayerWizard.indexPrivsErrorTitle', {
              defaultMessage: 'Missing index privileges',
            })}
            color="danger"
            iconType="alert"
          >
            <p>{this.state.createIndexError}</p>
          </EuiCallOut>
        );
      }
      return (
        <EuiCallOut
          title={i18n.translate('xpack.maps.layers.newVectorLayerWizard.createIndexErrorTitle', {
            defaultMessage: 'Unable to create index',
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
        <IndexNameForm
          indexName={this.state.indexName}
          indexNameError={this.state.indexNameError}
          onIndexNameChange={this._onIndexChange}
          onIndexNameValidationStart={() => {}}
          onIndexNameValidationEnd={() => {}}
        />
      </EuiPanel>
    );
  }
}
