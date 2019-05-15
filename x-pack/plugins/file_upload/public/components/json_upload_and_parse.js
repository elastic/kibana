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
    currentIndexingStage: 'Indexing data started',
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
    this._setSelectedType(this.state);
    this._setIndexReady({ ...this.state, ...this.props });
    this._indexData({ ...this.state, ...this.props });

    if (!_.isEqual(prevState.parsedFile, this.state.parsedFile)) {
      this._setIndexTypes({ ...this.state, ...this.props });
    }
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
    indexName, appName, selectedIndexType, onIndexAddSuccess, onIndexAddError,
    boolIndexData, isIndexReady
  }) => {
    const filesAreEqual = _.isEqual(indexedFile, parsedFile);
    if (!boolIndexData || filesAreEqual || !isIndexReady || indexRequestInFlight) {
      return;
    }
    this.setState({
      indexRequestInFlight: true,
      currentIndexingStage: `Writing to index `
    });

    const indexDataResp = await indexData(
      parsedFile, transformDetails, indexName, selectedIndexType, appName
    );
    if (indexDataResp) {
      this.setState({
        indexedFile: parsedFile,
        indexDataResp: indexDataResp,
      }, () => onIndexAddSuccess && onIndexAddSuccess(indexDataResp));
      this._createIndexPattern({ ...this.state, ...this.props });
    } else {
      this.setState({
        indexedFile: null,
        indexDataResp: 'Error indexing data',
      }, () => onIndexAddError && onIndexAddError('Error indexing data'));
      // Index data request complete
      this.setState({ indexRequestInFlight: false });
      this._resetFileAndIndexSettings();
    }
  }

  // Create Index Pattern
  _createIndexPattern = ({
    boolCreateIndexPattern, indexedFile, indexPatternRequestInFlight,
    indexName, onIndexPatternCreateSuccess, onIndexPatternCreateError
  }) => {
    const indexPatternReady = boolCreateIndexPattern && !!indexedFile &&
      indexName && !indexPatternRequestInFlight;
    if (!indexPatternReady) {
      return;
    }

    this.setState({
      indexPatternRequestInFlight: true,
      currentIndexingStage: `Creating index pattern `
    });
    createIndexPattern(indexName)
      .then(resp => {
        onIndexPatternCreateSuccess && onIndexPatternCreateSuccess(resp);
        this.setState({
          indexPatternRequestInFlight: false,
          indexPatternResp: resp,
          currentIndexingStage: `Indexing complete`
        }, () => this._resetFileAndIndexSettings());
      }).catch(err => {
        onIndexPatternCreateError && onIndexPatternCreateError(err);
        this.setState({
          indexPatternRequestInFlight: false,
          indexPatternResp: err,
          currentIndexingStage: `Indexing error`
        }, () => this._resetFileAndIndexSettings());
      });
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
            complete={currentIndexingStage === 'Indexing complete'}
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
  onIndexAddSuccess: PropTypes.func,
  onIndexAddError: PropTypes.func,
  onIndexPatternCreateSuccess: PropTypes.func,
  onIndexPatternCreateError: PropTypes.func,
};
