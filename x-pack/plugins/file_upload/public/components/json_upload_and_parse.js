/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiProgress, EuiText } from '@elastic/eui';
import PropTypes from 'prop-types';
import { IndexSettings } from './index_settings';
import { getIndexPatternService } from '../kibana_services';
import { GeoJsonFilePicker } from './geojson_file_picker';
import { ImportCompleteView } from './import_complete_view';
import { ES_FIELD_TYPES } from '../../../../../src/plugins/data/public';

const PHASE = {
  CONFIGURE: 'CONFIGURE',
  IMPORT: 'IMPORT',
  COMPLETE: 'COMPLETE',
};

function getWritingToIndexMsg(progress) {
  return i18n.translate('xpack.fileUpload.jsonUploadAndParse.writingToIndex', {
    defaultMessage: 'Writing to index: {progress}% complete',
    values: { progress },
  });
}

export class JsonUploadAndParse extends Component {
  state = {
    // Index state
    indexTypes: [],
    selectedIndexType: '',
    indexName: '',
    hasIndexErrors: false,
    isIndexReady: false,

    // Progress-tracking state
    importStatus: '',
    phase: PHASE.CONFIGURE,
    importResp: undefined,
    indexPatternResp: undefined,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._geojsonImporter) {
      this._geojsonImporter.destroy();
      this._geojsonImporter = null;
    }
  }

  componentDidUpdate() {
    this._setIndexReady();
    if (this.props.isIndexingTriggered && this.state.phase === PHASE.CONFIGURE) {
      this._import();
    }
  }

  _setIndexReady = () => {
    const isIndexReady =
      this._geojsonImporter !== undefined &&
      !!this.state.selectedIndexType &&
      !!this.state.indexName &&
      !this.state.hasIndexErrors &&
      this.state.phase === PHASE.CONFIGURE;
    if (isIndexReady !== this.state.isIndexReady) {
      this.setState({ isIndexReady });
      this.props.onIndexReady(isIndexReady);
    }
  };

  _import = async () => {
    //
    // create index
    //
    const settings = {
      number_of_shards: 1,
    };
    const mappings = {
      properties: {
        coordinates: {
          type: this.state.selectedIndexType,
        },
      },
    };
    const ingestPipeline = {};
    this.setState({
      importStatus: i18n.translate('xpack.fileUpload.jsonUploadAndParse.dataIndexingStarted', {
        defaultMessage: 'Creating index: {indexName}',
        values: { indexName: this.state.indexName },
      }),
      phase: PHASE.IMPORT,
    });
    this._geojsonImporter.setGeoFieldType(this.state.selectedIndexType);
    const initializeImportResp = await this._geojsonImporter.initializeImport(
      this.state.indexName,
      settings,
      mappings,
      ingestPipeline
    );
    if (!this._isMounted) {
      return;
    }
    if (initializeImportResp.index === undefined || initializeImportResp.id === undefined) {
      this.setState({
        phase: PHASE.COMPLETE,
      });
      this.props.onIndexingError();
      return;
    }

    //
    // import file
    //
    this.setState({
      importStatus: getWritingToIndexMsg(0),
    });
    const startImport = Date.now();
    const importResp = await this._geojsonImporter.import(
      initializeImportResp.id,
      this.state.indexName,
      initializeImportResp.pipelineId,
      (progress) => {
        if (this._isMounted) {
          this.setState({
            importStatus: getWritingToIndexMsg(progress),
          });
        }
      }
    );
    const millis = Date.now() - startImport;
    console.log(`import seconds ${millis}`);
    if (!this._isMounted) {
      return;
    }

    if (!importResp.success) {
      this.setState({
        importResp,
        importStatus: i18n.translate('xpack.fileUpload.jsonUploadAndParse.dataIndexingError', {
          defaultMessage: 'Data indexing error',
        }),
        phase: PHASE.COMPLETE,
      });
      this.props.onIndexingError();
      return;
    }

    //
    // create index pattern
    //
    this.setState({
      importResp,
      importStatus: i18n.translate('xpack.fileUpload.jsonUploadAndParse.creatingIndexPattern', {
        defaultMessage: 'Creating index pattern: {indexName}',
        values: { indexName: this.state.indexName },
      }),
    });
    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().createAndSave(
        {
          title: this.state.indexName,
        },
        true
      );
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          importStatus: i18n.translate('xpack.fileUpload.jsonUploadAndParse.indexPatternError', {
            defaultMessage: 'Index pattern error',
          }),
          phase: PHASE.COMPLETE,
        });
        this.props.onIndexingError();
      }
      return;
    }
    if (!this._isMounted) {
      return;
    }

    //
    // Successful import
    //
    this.setState({
      indexPatternResp: {
        success: true,
        id: indexPattern.id,
        fields: indexPattern.fields,
      },
      phase: PHASE.COMPLETE,
      importStatus: '',
    });
    this.props.onIndexingComplete({
      indexDataResp: importResp,
      indexPattern,
    });
  };

  _onFileSelect = ({ features, hasPoints, hasShapes, importer, indexName, previewCoverage }) => {
    this._geojsonImporter = importer;

    const geoFieldTypes = hasPoints
      ? [ES_FIELD_TYPES.GEO_POINT, ES_FIELD_TYPES.GEO_SHAPE]
      : [ES_FIELD_TYPES.GEO_SHAPE];

    const newState = {
      indexTypes: geoFieldTypes,
      indexName,
    };
    if (!this.state.selectedIndexType) {
      // auto select index type
      newState.selectedIndexType =
        hasPoints && !hasShapes ? ES_FIELD_TYPES.GEO_POINT : ES_FIELD_TYPES.GEO_SHAPE;
    } else if (
      this.state.selectedIndexType &&
      !geoFieldTypes.includes(this.state.selectedIndexType)
    ) {
      // unselected indexType if selected type is not longer an option
      newState.selectedIndexType = '';
    }
    this.setState(newState);

    this.props.onFileUpload(
      {
        type: 'FeatureCollection',
        features,
      },
      indexName,
      previewCoverage
    );
  };

  _onFileClear = () => {
    if (this._geojsonImporter) {
      this._geojsonImporter.destroy();
      this._geojsonImporter = undefined;
    }

    this.props.onFileRemove();

    this.setState({
      indexTypes: [],
      selectedIndexType: '',
      indexName: '',
    });
  };

  render() {
    if (this.state.phase === PHASE.IMPORT) {
      return (
        <Fragment>
          <EuiProgress size="xs" color="accent" position="absolute" />
          <EuiText>
            <p>{this.state.importStatus}</p>
          </EuiText>
        </Fragment>
      );
    }

    if (this.state.phase === PHASE.COMPLETE) {
      return (
        <ImportCompleteView
          importResp={this.state.importResp}
          indexPatternResp={this.state.indexPatternResp}
        />
      );
    }

    return (
      <EuiForm>
        <GeoJsonFilePicker onSelect={this._onFileSelect} onClear={this._onFileClear} />
        <IndexSettings
          disabled={this._geojsonImporter === undefined}
          indexName={this.state.indexName}
          setIndexName={(indexName) => this.setState({ indexName })}
          indexTypes={this.state.indexTypes}
          selectedIndexType={this.state.selectedIndexType}
          setSelectedIndexType={(selectedIndexType) => this.setState({ selectedIndexType })}
          setHasIndexErrors={(hasIndexErrors) => this.setState({ hasIndexErrors })}
        />
      </EuiForm>
    );
  }
}

JsonUploadAndParse.defaultProps = {
  isIndexingTriggered: false,
};

JsonUploadAndParse.propTypes = {
  isIndexingTriggered: PropTypes.bool,
  onIndexReadyStatusChange: PropTypes.func,
  onIndexingComplete: PropTypes.func,
  onIndexingError: PropTypes.func,
  onFileUpload: PropTypes.func,
  onFileRemove: PropTypes.func,
};
