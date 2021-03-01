/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm } from '@elastic/eui';
import PropTypes from 'prop-types';
import { IndexSettings } from './index_settings';
import { JsonIndexFilePicker } from './json_index_file_picker';
import { JsonImportProgress } from './json_import_progress';
import _ from 'lodash';
import { GeoJsonImporter } from '../importer/geojson_importer';
import { ES_FIELD_TYPES } from '../../../../../src/plugins/data/public';
import { getIndexPatternService } from '../kibana_services';

const INDEXING_STAGE = {
  INDEXING_STARTED: i18n.translate('xpack.fileUpload.jsonUploadAndParse.dataIndexingStarted', {
    defaultMessage: 'Data indexing started',
  }),
  WRITING_TO_INDEX: i18n.translate('xpack.fileUpload.jsonUploadAndParse.writingToIndex', {
    defaultMessage: 'Writing to index',
  }),
  INDEXING_COMPLETE: i18n.translate('xpack.fileUpload.jsonUploadAndParse.indexingComplete', {
    defaultMessage: 'Indexing complete',
  }),
  CREATING_INDEX_PATTERN: i18n.translate(
    'xpack.fileUpload.jsonUploadAndParse.creatingIndexPattern',
    { defaultMessage: 'Creating index pattern' }
  ),
  INDEX_PATTERN_COMPLETE: i18n.translate(
    'xpack.fileUpload.jsonUploadAndParse.indexPatternComplete',
    { defaultMessage: 'Index pattern complete' }
  ),
  INDEXING_ERROR: i18n.translate('xpack.fileUpload.jsonUploadAndParse.dataIndexingError', {
    defaultMessage: 'Data indexing error',
  }),
  INDEX_PATTERN_ERROR: i18n.translate('xpack.fileUpload.jsonUploadAndParse.indexPatternError', {
    defaultMessage: 'Index pattern error',
  }),
};

export class JsonUploadAndParse extends Component {
  geojsonImporter = new GeoJsonImporter();

  state = {
    // File state
    fileRef: null,
    parsedFile: null,
    indexedFile: null,

    // Index state
    indexTypes: [],
    selectedIndexType: '',
    indexName: '',
    indexRequestInFlight: false,
    indexPatternRequestInFlight: false,
    hasIndexErrors: false,
    isIndexReady: false,

    // Progress-tracking state
    showImportProgress: false,
    currentIndexingStage: INDEXING_STAGE.INDEXING_STARTED,
    indexDataResp: '',
    indexPatternResp: '',
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _resetFileAndIndexSettings = () => {
    if (this.props.onFileRemove && this.state.fileRef) {
      this.props.onFileRemove(this.state.fileRef);
    }
    this.setState({
      indexTypes: [],
      selectedIndexType: '',
      indexName: '',
      indexedFile: null,
      parsedFile: null,
      fileRef: null,
    });
  };

  componentDidUpdate() {
    this._updateIndexType();
    this._setIndexReady({ ...this.state, ...this.props });
    this._indexData({ ...this.state, ...this.props });
    if (this.props.isIndexingTriggered && !this.state.showImportProgress && this._isMounted) {
      this.setState({ showImportProgress: true });
    }
  }

  _updateIndexType() {
    let nextIndexTypes = [];
    if (this.state.parsedFile) {
      nextIndexTypes =
        this.state.parsedFile.geometryTypes.includes('Point') ||
        this.state.parsedFile.geometryTypes.includes('MultiPoint')
          ? [ES_FIELD_TYPES.GEO_POINT, ES_FIELD_TYPES.GEO_SHAPE]
          : [ES_FIELD_TYPES.GEO_SHAPE];
    }
    if (!_.isEqual(nextIndexTypes, this.state.indexTypes)) {
      this.setState({ indexTypes: nextIndexTypes });
    }

    if (!this.state.selectedIndexType && nextIndexTypes.length) {
      // auto select index type
      this.setState({ selectedIndexType: nextIndexTypes[0] });
    } else if (
      this.state.selectedIndexType &&
      !nextIndexTypes.includes(this.state.selectedIndexType)
    ) {
      // unselected indexType if selected type is not longer an option
      this.setState({ selectedIndexType: null });
    }
  }

  _setIndexReady = ({
    parsedFile,
    selectedIndexType,
    indexName,
    hasIndexErrors,
    indexRequestInFlight,
    onIndexReady,
  }) => {
    const isIndexReady =
      !!parsedFile &&
      !!selectedIndexType &&
      !!indexName &&
      !hasIndexErrors &&
      !indexRequestInFlight;
    if (isIndexReady !== this.state.isIndexReady) {
      this.setState({ isIndexReady });
      if (onIndexReady) {
        onIndexReady(isIndexReady);
      }
    }
  };

  _indexData = async ({
    indexedFile,
    parsedFile,
    indexRequestInFlight,
    indexName,
    selectedIndexType,
    isIndexingTriggered,
    isIndexReady,
    onIndexingComplete,
    onIndexingError,
  }) => {
    // Check index ready
    const filesAreEqual = _.isEqual(indexedFile, parsedFile);
    if (!isIndexingTriggered || filesAreEqual || !isIndexReady || indexRequestInFlight) {
      return;
    }
    this.setState({
      indexRequestInFlight: true,
      currentIndexingStage: INDEXING_STAGE.WRITING_TO_INDEX,
    });

    this.geojsonImporter.setDocs(parsedFile.parsedGeojson, selectedIndexType);

    // initialize import
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
    const initializeImportResp = await this.geojsonImporter.initializeImport(
      indexName,
      settings,
      mappings,
      ingestPipeline
    );
    if (!this._isMounted) {
      return;
    }
    if (initializeImportResp.index === undefined || initializeImportResp.id === undefined) {
      this.setState({
        indexRequestInFlight: false,
        currentIndexingStage: INDEXING_STAGE.INDEXING_ERROR,
      });
      this._resetFileAndIndexSettings();
      onIndexingError();
      return;
    }

    // import file
    const importResp = await this.geojsonImporter.import(
      initializeImportResp.id,
      indexName,
      initializeImportResp.pipelineId,
      () => {}
    );
    if (!this._isMounted) {
      return;
    }
    if (!importResp.success) {
      this.setState({
        indexDataResp: importResp,
        indexRequestInFlight: false,
        currentIndexingStage: INDEXING_STAGE.INDEXING_ERROR,
      });
      this._resetFileAndIndexSettings();
      onIndexingError();
      return;
    }
    this.setState({
      indexDataResp: importResp,
      indexedFile: parsedFile,
      currentIndexingStage: INDEXING_STAGE.INDEXING_COMPLETE,
    });

    // create index pattern
    this.setState({
      indexPatternRequestInFlight: true,
      currentIndexingStage: INDEXING_STAGE.CREATING_INDEX_PATTERN,
    });
    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().createAndSave(
        {
          title: indexName,
        },
        true
      );
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          indexPatternRequestInFlight: false,
          currentIndexingStage: INDEXING_STAGE.INDEX_PATTERN_ERROR,
        });
        this._resetFileAndIndexSettings();
        onIndexingError();
      }
      return;
    }
    if (!this._isMounted) {
      return;
    }
    this.setState({
      indexPatternResp: {
        success: true,
        id: indexPattern.id,
        fields: indexPattern.fields,
      },
      indexPatternRequestInFlight: false,
    });
    this.setState({
      currentIndexingStage: INDEXING_STAGE.INDEX_PATTERN_COMPLETE,
    });
    this._resetFileAndIndexSettings();
    onIndexingComplete({
      indexDataResp: importResp,
      indexPattern,
    });
  };

  render() {
    const {
      currentIndexingStage,
      indexDataResp,
      indexPatternResp,
      fileRef,
      indexName,
      indexTypes,
      showImportProgress,
    } = this.state;

    return (
      <EuiForm>
        {showImportProgress ? (
          <JsonImportProgress
            importStage={currentIndexingStage}
            indexDataResp={indexDataResp}
            indexPatternResp={indexPatternResp}
            complete={
              currentIndexingStage === INDEXING_STAGE.INDEX_PATTERN_COMPLETE ||
              currentIndexingStage === INDEXING_STAGE.INDEXING_ERROR
            }
            indexName={indexName}
          />
        ) : (
          <Fragment>
            <JsonIndexFilePicker
              fileRef={fileRef}
              setFileRef={(fileRef) => this.setState({ fileRef })}
              setParsedFile={(parsedFile, indexName) => {
                this.setState({ parsedFile, indexName });
                this.props.onFileUpload(parsedFile.parsedGeojson, indexName);
              }}
              resetFileAndIndexSettings={this._resetFileAndIndexSettings}
              geojsonImporter={this.geojsonImporter}
            />
            <IndexSettings
              disabled={!fileRef}
              indexName={indexName}
              setIndexName={(indexName) => this.setState({ indexName })}
              indexTypes={indexTypes}
              setSelectedIndexType={(selectedIndexType) => this.setState({ selectedIndexType })}
              setHasIndexErrors={(hasIndexErrors) => this.setState({ hasIndexErrors })}
            />
          </Fragment>
        )}
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
