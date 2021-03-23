/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { FeatureCollection } from 'geojson';
import { EuiPanel } from '@elastic/eui';
import { IndexPattern, IFieldType } from 'src/plugins/data/public';
import {
  ES_GEO_FIELD_TYPE,
  DEFAULT_MAX_RESULT_WINDOW,
  SCALING_TYPES,
} from '../../../../common/constants';
import { getFileUpload } from '../../../kibana_services';
import { GeoJsonFileSource } from '../../sources/geojson_file_source';
import { VectorLayer } from '../../layers/vector_layer';
import { createDefaultLayerDescriptor } from '../../sources/es_search_source';
import { RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { FileUploadComponentProps, ImportResults } from '../../../../../file_upload/public';

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
  fileUploadComponent: React.ComponentType<FileUploadComponentProps> | null;
}

export class ClientFileCreateSourceEditor extends Component<RenderWizardArguments, State> {
  private _isMounted: boolean = false;

  state: State = {
    indexingStage: null,
    fileUploadComponent: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadFileUploadComponent();
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

  async _loadFileUploadComponent() {
    const fileUploadComponent = await getFileUpload().getFileUploadComponent();
    if (this._isMounted) {
      this.setState({ fileUploadComponent });
    }
  }

  _onFileUpload = (geojsonFile: FeatureCollection, name: string, previewCoverage: number) => {
    if (!this._isMounted) {
      return;
    }

    if (!geojsonFile) {
      this.props.previewLayers([]);
      return;
    }

    const areResultsTrimmed = previewCoverage < 100;
    const sourceDescriptor = GeoJsonFileSource.createDescriptor({
      __featureCollection: geojsonFile,
      areResultsTrimmed,
      tooltipContent: areResultsTrimmed
        ? i18n.translate('xpack.maps.fileUpload.trimmedResultsMsg', {
            defaultMessage: `Results limited to {numFeatures} features, {previewCoverage}% of file.`,
            values: {
              numFeatures: geojsonFile.features.length,
              previewCoverage,
            },
          })
        : null,
      name,
    });
    const layerDescriptor = VectorLayer.createDescriptor(
      { sourceDescriptor },
      this.props.mapColors
    );
    this.props.previewLayers([layerDescriptor]);
  };

  _onIndexingComplete = (results: { indexDataResp: ImportResults; indexPattern: IndexPattern }) => {
    if (!this._isMounted) {
      return;
    }

    this.props.advanceToNextStep();

    const geoField = results.indexPattern.fields.find((field: IFieldType) =>
      [ES_GEO_FIELD_TYPE.GEO_POINT as string, ES_GEO_FIELD_TYPE.GEO_SHAPE as string].includes(
        field.type
      )
    );
    if (!results.indexPattern.id || !geoField) {
      this.setState({ indexingStage: INDEXING_STAGE.ERROR });
      this.props.previewLayers([]);
    } else {
      const esSearchSourceConfig = {
        indexPatternId: results.indexPattern.id,
        geoField: geoField.name,
        // Only turn on bounds filter for large doc counts
        // @ts-ignore
        filterByMapBounds: results.indexDataResp.docCount > DEFAULT_MAX_RESULT_WINDOW,
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

  _onIndexingError = () => {
    if (!this._isMounted) {
      return;
    }

    this.props.stopStepLoading();
    this.props.disableNextBtn();

    this.setState({ indexingStage: INDEXING_STAGE.ERROR });
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
    if (!this.state.fileUploadComponent) {
      return null;
    }

    const FileUpload = this.state.fileUploadComponent;
    return (
      <EuiPanel>
        <FileUpload
          isIndexingTriggered={this.state.indexingStage === INDEXING_STAGE.TRIGGERED}
          onFileUpload={this._onFileUpload}
          onFileRemove={this._onFileRemove}
          onIndexReady={this._onIndexReady}
          onIndexingComplete={this._onIndexingComplete}
          onIndexingError={this._onIndexingError}
        />
      </EuiPanel>
    );
  }
}
