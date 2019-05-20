/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiForm,
} from '@elastic/eui';
import PropTypes from 'prop-types';
import { indexData, createIndexPattern } from '../util/indexing_service';
import { getGeoIndexTypesForFeatures } from '../util/geo_processing';
import { IndexSettings } from './index_settings';
import { JsonIndexFilePicker } from './json_index_file_picker';
import { JsonImportProgress } from './json_import_progress';
import _ from 'lodash';

const INDEXING_STAGE = {
  INDEXING_STARTED: 'Data indexing started',
  WRITING_TO_INDEX: 'Writing to index',
  INDEXING_COMPLETE: 'Indexing complete',
  CREATING_INDEX_PATTERN: 'Creating index pattern',
  INDEX_PATTERN_COMPLETE: 'Index pattern complete',
  DATA_INDEXING_ERROR: 'Data indexing error',
  INDEX_PATTERN_ERROR: 'Index pattern error',
};

export class JsonUploadAndParse extends Component {

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
    currentIndexingStage: INDEXING_STAGE.INDEXING_STARTED,
    indexDataResp: '',
    indexPatternResp: '',
  };

  _resetFileAndIndexSettings = () => {
    this.setState({
      indexTypes: [],
      selectedIndexType: '',
      indexName: '',
      indexedFile: null,
      parsedFile: null,
      fileRef: null,
    });
  };

  componentDidUpdate(prevProps, prevState) {
    if (!_.isEqual(prevState.parsedFile, this.state.parsedFile)) {
      this._setIndexTypes({ ...this.state, ...this.props });
    }
    this._setSelectedType(this.state);
    this._setIndexReady({ ...this.state, ...this.props });
    this._indexData({ ...this.state, ...this.props });
  }

  _setSelectedType = ({ selectedIndexType, indexTypes }) => {
    if (!selectedIndexType && indexTypes.length) {
      this.setState({ selectedIndexType: indexTypes[0] });
    }
  }

  _setIndexReady = ({
    parsedFile, selectedIndexType, indexName, hasIndexErrors,
    indexRequestInFlight, onIndexReadyStatusChange
  }) => {
    const isIndexReady = !!parsedFile && !!selectedIndexType &&
      !!indexName && !hasIndexErrors && !indexRequestInFlight;
    if (isIndexReady !== this.state.isIndexReady) {
      this.setState({ isIndexReady });
      onIndexReadyStatusChange && onIndexReadyStatusChange(isIndexReady);
    }
  }

  _indexData = async ({
    indexedFile, parsedFile, indexRequestInFlight, transformDetails,
    indexName, appName, selectedIndexType, boolIndexData, isIndexReady,
    onIndexingComplete, boolCreateIndexPattern
  }) => {
    // Check index ready
    const filesAreEqual = _.isEqual(indexedFile, parsedFile);
    if (!boolIndexData || filesAreEqual || !isIndexReady || indexRequestInFlight) {
      return;
    }
    this.setState({
      indexRequestInFlight: true,
      currentIndexingStage: INDEXING_STAGE.WRITING_TO_INDEX
    });

    // Index data
    const indexDataResp = await indexData(
      parsedFile, transformDetails, indexName, selectedIndexType, appName
    );

    // Index error
    if (!indexDataResp.success) {
      this.setState({
        indexedFile: null,
        indexDataResp: INDEXING_STAGE.DATA_INDEXING_ERROR, // Reformat response
        indexRequestInFlight: false,
      });
      this._resetFileAndIndexSettings();
      return;
    }

    // Index data success. Update state & create index pattern
    this.setState({
      indexDataResp,
      indexedFile: parsedFile,
    });
    let indexPatternResp;
    if (boolCreateIndexPattern) {
      indexPatternResp = await this._createIndexPattern(this.state);
    }

    // Indexing complete, update state & callback (if any)
    this.setState({ currentIndexingStage: INDEXING_STAGE.INDEXING_COMPLETE });
    if (onIndexingComplete) {
      onIndexingComplete({
        indexDataResp,
        ...(boolCreateIndexPattern ? { indexPatternResp } : {})
      });
    }
  }

  _createIndexPattern = async ({ indexName }) => {
    this.setState({
      indexPatternRequestInFlight: true,
      currentIndexingStage: INDEXING_STAGE.CREATING_INDEX_PATTERN
    });
    const indexPatternResp = await createIndexPattern(indexName);

    this.setState({
      indexPatternResp,
      indexPatternRequestInFlight: false,
    });
    this._resetFileAndIndexSettings();

    return indexPatternResp;
  }

  // This is mostly for geo. Some data have multiple valid index types that can
  // be chosen from, such as 'geo_point' vs. 'geo_shape' for point data
  _setIndexTypes = ({ transformDetails, parsedFile }) => {
    if (parsedFile) {
      // User-provided index types
      if (typeof transformDetails === 'object') {
        this.setState({ indexTypes: transformDetails.indexTypes });
      } else {
        // Included index types
        switch (transformDetails) {
          case 'geo':
            const featureTypes = _.uniq(
              parsedFile.features.map(({ geometry }) => geometry.type)
            );
            this.setState({
              indexTypes: getGeoIndexTypesForFeatures(featureTypes)
            });
            break;
          default:
            this.setState({ indexTypes: [] });
            return;
        }
      }
    }
  }

  render() {
    const {
      currentIndexingStage, indexDataResp, indexPatternResp, fileRef,
      indexName, indexTypes
    } = this.state;
    const { onFileUpload, onFileRemove, transformDetails, boolIndexData }
      = this.props;

    return (
      <EuiForm>
        {boolIndexData
          ? <JsonImportProgress
            importStage={currentIndexingStage}
            indexDataResp={indexDataResp}
            indexPatternResp={indexPatternResp}
            complete={currentIndexingStage === INDEXING_STAGE.INDEXING_COMPLETE}
            indexName={indexName}
          />
          : (
            <Fragment>
              <JsonIndexFilePicker
                {...{
                  onFileUpload,
                  onFileRemove,
                  fileRef,
                  setFileRef: fileRef => this.setState({ fileRef }),
                  setParsedFile: parsedFile => this.setState({ parsedFile }),
                  transformDetails,
                  resetFileAndIndexSettings: this._resetFileAndIndexSettings,
                }}
              />
              <IndexSettings
                disabled={!fileRef}
                indexName={indexName}
                setIndexName={indexName => this.setState({ indexName })}
                indexTypes={indexTypes}
                setSelectedIndexType={selectedIndexType =>
                  this.setState({ selectedIndexType })
                }
                setHasIndexErrors={hasIndexErrors =>
                  this.setState({ hasIndexErrors })
                }
              />
            </Fragment>
          )
        }
      </EuiForm>
    );
  }
}

JsonUploadAndParse.defaultProps = {
  boolIndexData: false,
  boolCreateIndexPattern: true,
};

JsonUploadAndParse.propTypes = {
  appName: PropTypes.string,
  boolIndexData: PropTypes.bool,
  boolCreateIndexPattern: PropTypes.bool,
  transformDetails: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]),
  onIndexReadyStatusChange: PropTypes.func,
  onIndexingComplete: PropTypes.func,
};
