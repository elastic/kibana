/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { useState, useEffect } from 'react';
import {
  EuiForm,
} from '@elastic/eui';
import PropTypes from 'prop-types';
import { indexData, createIndexPattern } from '../util/indexing_service';
import { getGeoIndexTypesForFeatures } from '../util/geo_processing';
import { IndexSettings } from './index_settings';
import { JsonIndexFilePicker } from './json_index_file_picker';
import _ from 'lodash';

export function JsonUploadAndParse({
  appName,
  boolIndexData,
  boolCreateIndexPattern,
  transformDetails,
  onFileUpload,
  onFileRemove,
  onIndexReadyStatusChange,
  onIndexAddSuccess,
  onIndexAddError,
  onIndexPatternCreateSuccess,
  onIndexPatternCreateError,
}) {

  // File state
  const [fileRef, setFileRef] = useState(null);
  const [parsedFile, setParsedFile] = useState(null);
  const [indexedFile, setIndexedFile] = useState(null);

  // Index state
  const [indexTypes, setIndexTypes] = useState([]);
  const [selectedIndexType, setSelectedIndexType] = useState('');
  const [indexName, setIndexName] = useState('');
  const [indexRequestInFlight, setIndexRequestInFlight] = useState(false);
  const [indexPatternRequestInFlight, setIndexPatternRequestInFlight] = useState(false);
  const [hasIndexErrors, setHasIndexErrors] = useState(false);
  const [indexReady, setIndexReady] = useState(false);

  const resetFileAndIndexSettings = () => {
    setIndexTypes([]);
    setSelectedIndexType('');
    setIndexName('');
    setParsedFile(null);
  };

  // Set default index type
  useEffect(() => {
    if (!selectedIndexType && indexTypes.length) {
      setSelectedIndexType(indexTypes[0]);
    }
  }, [selectedIndexType, indexTypes]);

  // Set index ready
  useEffect(() => {
    const boolIndexReady = !!parsedFile && !!selectedIndexType &&
      !!indexName && !hasIndexErrors && !indexRequestInFlight;
    setIndexReady(boolIndexReady);
    onIndexReadyStatusChange(boolIndexReady);
  }, [
    parsedFile, selectedIndexType, indexName, hasIndexErrors,
    indexRequestInFlight, onIndexReadyStatusChange
  ]);

  // Index data
  useEffect(() => {
    const filesAreEqual = _.isEqual(indexedFile, parsedFile);
    if (!boolIndexData || filesAreEqual || !indexReady) {
      return;
    }
    setIndexRequestInFlight(true);

    indexData(
      parsedFile, transformDetails, indexName, selectedIndexType, appName
    ).then(resp => {
      setIndexedFile(parsedFile);
      onIndexAddSuccess && onIndexAddSuccess(resp);
    }).catch(() => {
      setIndexedFile(null);
      onIndexAddError && onIndexAddError();
    });

  }, [
    selectedIndexType, boolIndexData, parsedFile, indexedFile, transformDetails,
    indexName, onIndexAddSuccess, onIndexAddError, appName, indexReady
  ]);

  // Index data request complete
  useEffect(() => {
    setIndexRequestInFlight(false);
    if (!boolCreateIndexPattern) {
      resetFileAndIndexSettings();
    }
  }, [indexedFile, boolCreateIndexPattern]);

  // Create Index Pattern
  useEffect(() => {
    const indexPatternReady = boolCreateIndexPattern && !!indexedFile &&
      indexName && !indexPatternRequestInFlight;
    if (!indexPatternReady) {
      return;
    }

    setIndexPatternRequestInFlight(true);
    createIndexPattern(indexName)
      .then(resp => {
        onIndexPatternCreateSuccess && onIndexPatternCreateSuccess(resp);
        setIndexPatternRequestInFlight(false);
      }).catch(err => {
        onIndexPatternCreateError && onIndexPatternCreateError(err);
        setIndexPatternRequestInFlight(false);
      });
    resetFileAndIndexSettings();
  }, [
    indexName, onIndexPatternCreateError, onIndexPatternCreateSuccess,
    boolCreateIndexPattern, indexPatternRequestInFlight, indexedFile
  ]);

  // This is mostly for geo. Some data have multiple valid index types that can
  // be chosen from, such as 'geo_point' vs. 'geo_shape' for point data
  useEffect(() => {
    if (parsedFile) {
      // User-provided index types
      if (typeof transformDetails === 'object') {
        setIndexTypes(transformDetails.indexTypes);
      } else {
        // Included index types
        switch(transformDetails) {
          case 'geo':
            const featureTypes = _.uniq(
              parsedFile.features.map(({ geometry }) => geometry.type)
            );
            setIndexTypes(getGeoIndexTypesForFeatures(featureTypes));
            break;
          default:
            setIndexTypes([]);
            return;
        }
      }
    }
  }, [parsedFile, transformDetails]);

  return (
    <EuiForm>
      <JsonIndexFilePicker
        {...{
          onFileUpload,
          onFileRemove,
          fileRef,
          setFileRef,
          setParsedFile,
          transformDetails,
          resetFileAndIndexSettings,
        }}
      />
      <IndexSettings
        disabled={!fileRef}
        indexName={indexName}
        setIndexName={setIndexName}
        indexTypes={indexTypes}
        setSelectedIndexType={setSelectedIndexType}
        setHasIndexErrors={setHasIndexErrors}
      />
    </EuiForm>
  );
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
