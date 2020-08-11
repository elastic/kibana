/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { FeatureCollection } from 'geojson';
import { EuiPanel } from '@elastic/eui';
import { IFieldType } from 'src/plugins/data/public';
import {
  ES_GEO_FIELD_TYPE,
  DEFAULT_MAX_RESULT_WINDOW,
  SCALING_TYPES,
} from '../../../../common/constants';
import { getFileUploadComponent } from '../../../kibana_services';
import { GeojsonFileSource } from '../../sources/geojson_file_source';
import { VectorLayer } from '../../layers/vector_layer/vector_layer';
// @ts-expect-error
import { createDefaultLayerDescriptor } from '../../sources/es_search_source';
import { RenderWizardArguments } from '../../layers/layer_wizard_registry';

export const INDEX_SETUP_STEP_ID = 'INDEX_SETUP_STEP_ID';
export const INDEXING_STEP_ID = 'INDEXING_STEP_ID';

enum INDEXING_STAGE {
  READY = 'READY',
  TRIGGERED = 'TRIGGERED',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

interface State {
  indexingStage: INDEXING_STAGE | null;
}

export class ClientFileCreateSourceEditor extends Component<RenderWizardArguments, State> {
  private _isMounted: boolean = false;

  state = {
    indexingStage: null,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (
      this.props.currentStepId === INDEXING_STEP_ID &&
      this.state.indexingStage === INDEXING_STAGE.READY
    ) {
      this.setState({ indexingStage: INDEXING_STAGE.TRIGGERED });
      this.props.startStepLoading();
    }
  }

  _onFileUpload = (geojsonFile: FeatureCollection, name: string) => {
    if (!this._isMounted) {
      return;
    }

    if (!geojsonFile) {
      this.props.previewLayers([]);
      return;
    }

    const sourceDescriptor = GeojsonFileSource.createDescriptor(geojsonFile, name);
    const layerDescriptor = VectorLayer.createDescriptor(
      { sourceDescriptor },
      this.props.mapColors
    );
    this.props.previewLayers([layerDescriptor]);
  };

  _onIndexingComplete = (indexResponses: { indexDataResp: unknown; indexPatternResp: unknown }) => {
    if (!this._isMounted) {
      return;
    }

    this.props.advanceToNextStep();

    const { indexDataResp, indexPatternResp } = indexResponses;

    // @ts-ignore
    const indexCreationFailed = !(indexDataResp && indexDataResp.success);
    // @ts-ignore
    const allDocsFailed = indexDataResp.failures.length === indexDataResp.docCount;
    // @ts-ignore
    const indexPatternCreationFailed = !(indexPatternResp && indexPatternResp.success);
    if (indexCreationFailed || allDocsFailed || indexPatternCreationFailed) {
      this.setState({ indexingStage: INDEXING_STAGE.ERROR });
      return;
    }

    // @ts-ignore
    const { fields, id: indexPatternId } = indexPatternResp;
    const geoField = fields.find((field: IFieldType) =>
      [ES_GEO_FIELD_TYPE.GEO_POINT as string, ES_GEO_FIELD_TYPE.GEO_SHAPE as string].includes(
        field.type
      )
    );
    if (!indexPatternId || !geoField) {
      this.setState({ indexingStage: INDEXING_STAGE.ERROR });
      this.props.previewLayers([]);
    } else {
      const esSearchSourceConfig = {
        indexPatternId,
        geoField: geoField.name,
        // Only turn on bounds filter for large doc counts
        // @ts-ignore
        filterByMapBounds: indexDataResp.docCount > DEFAULT_MAX_RESULT_WINDOW,
        scalingType:
          geoField.type === ES_GEO_FIELD_TYPE.GEO_POINT
            ? SCALING_TYPES.CLUSTERS
            : SCALING_TYPES.LIMIT,
      };
      this.setState({ indexingStage: INDEXING_STAGE.SUCCESS });
      this.props.previewLayers([
        createDefaultLayerDescriptor(esSearchSourceConfig, this.props.mapColors),
      ]);
    }
  };

  // Called on file upload screen when UI state changes
  _onIndexReady = (indexReady: boolean) => {
    if (!this._isMounted) {
      return;
    }
    this.setState({ indexingStage: indexReady ? INDEXING_STAGE.READY : null });
    if (indexReady) {
      this.props.enableNextBtn();
    } else {
      this.props.disableNextBtn();
    }
  };

  // Called on file upload screen when upload file is changed or removed
  _onFileRemove = () => {
    this.props.previewLayers([]);
  };

  render() {
    const FileUpload = getFileUploadComponent();
    return (
      <EuiPanel>
        <FileUpload
          appName={'Maps'}
          isIndexingTriggered={this.state.indexingStage === INDEXING_STAGE.TRIGGERED}
          onFileUpload={this._onFileUpload}
          onFileRemove={this._onFileRemove}
          onIndexReady={this._onIndexReady}
          transformDetails={'geo'}
          onIndexingComplete={this._onIndexingComplete}
        />
      </EuiPanel>
    );
  }
}
