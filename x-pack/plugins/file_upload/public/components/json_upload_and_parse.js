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

export function JsonUploadAndParse(props) {
  const {
    appName,
    boolIndexData = false,
    boolCreateIndexPattern = true,
    preIndexTransform,
    onIndexReadyStatusChange,
    onIndexAddSuccess,
    onIndexAddError,
    onIndexPatternCreateSuccess,
    onIndexPatternCreateError,
  } = props;

  // Local state for parsed file and indexed details
  const [fileRef, setFileRef] = useState(null);
  const [parsedFile, setParsedFile] = useState(null);
  const [indexedFile, setIndexedFile] = useState(null);
  const [indexDataType, setIndexDataType] = useState('');
  const [indexName, setIndexName] = useState('');
  const [indexPattern, setIndexPattern] = useState('');
  const [indexTypes, setIndexTypes] = useState([]);
  const [indexRequestInFlight, setIndexRequestInFlight] = useState(false);
  const [hasIndexErrors, setHasIndexErrors] = useState(false);

  // If index flag set, index on update
  useEffect(() => {
    if (!indexDataType && indexTypes.length) {
      setIndexDataType(indexTypes[0]);
    }

    const indexReady = !!parsedFile && !!indexDataType && !!indexName && !hasIndexErrors;
    onIndexReadyStatusChange(indexReady);

    const isNewFile = !_.isEqual(indexedFile, parsedFile);

    if (boolIndexData && !indexRequestInFlight && parsedFile && isNewFile) {
      setIndexRequestInFlight(true);

      (async () => {
        // Index parsed file
        const indexDataResponse = await
        indexData(parsedFile, preIndexTransform,
          indexName, indexDataType, appName);
        const indexDataSuccess = indexDataResponse && indexDataResponse.success;
        if (indexDataSuccess) {
          setIndexedFile(parsedFile);
          onIndexAddSuccess && onIndexAddSuccess(indexDataResponse);
        } else {
          setIndexedFile(null);
          onIndexAddError && onIndexAddError();
        }
        setIndexRequestInFlight(false);

        // Create Index Pattern
        if (boolCreateIndexPattern && indexDataSuccess) {
          const indexPatternCreateResponse =
            await createIndexPattern(indexPattern || indexName);
          const indexPatternCreateSuccess = indexPatternCreateResponse &&
            indexPatternCreateResponse.success;
          if (indexPatternCreateSuccess) {
            onIndexPatternCreateSuccess && onIndexPatternCreateSuccess(indexPatternCreateResponse);
          } else {
            onIndexPatternCreateError && onIndexPatternCreateError(indexPatternCreateResponse);
          }
        }
      })();
    }

  }, [indexDataType, indexTypes, boolIndexData, indexRequestInFlight,
    parsedFile, indexedFile, preIndexTransform, indexName, onIndexAddSuccess,
    onIndexAddError, hasIndexErrors, onIndexReadyStatusChange, appName,
    boolCreateIndexPattern, indexPattern, onIndexPatternCreateError,
    onIndexPatternCreateSuccess]
  );

  useEffect(() => {
    // Determine index options
    if (parsedFile) {
      if (typeof preIndexTransform === 'object') {
        setIndexTypes(preIndexTransform.indexTypes);
      } else {
        switch(preIndexTransform) {
          case 'geo':
            const featureTypes = _.uniq(
              parsedFile.features.map(({ geometry }) => geometry.type)
            );
            setIndexTypes(getGeoIndexTypesForFeatures(featureTypes));
            break;
          default:
            throw(`Index options for ${preIndexTransform} not defined`);
            return;
        }
      }
    }
  }, [parsedFile, preIndexTransform]);

  return (
    <EuiForm>
      <JsonIndexFilePicker
        {...{
          ...props,
          fileRef,
          setFileRef,
          parsedFile,
          setParsedFile,
          setIndexedFile,
          indexName,
          preIndexTransform,
          indexDataType
        }}
      />
      <IndexSettings
        disabled={!fileRef}
        indexName={indexName}
        setIndexName={setIndexName}
        indexPattern={indexPattern}
        setIndexPattern={setIndexPattern}
        setIndexDataType={setIndexDataType}
        indexTypes={indexTypes}
        setHasIndexErrors={setHasIndexErrors}
      />
    </EuiForm>
  );
}

JsonUploadAndParse.propTypes = {
  boolIndexData: PropTypes.bool,
  indexDescription: PropTypes.object,
  fileUploadMessage: PropTypes.string,
  onFileUpload: PropTypes.func,
  onFileRemove: PropTypes.func,
  postParseJsonTransform: PropTypes.func,
  onIndexAddSuccess: PropTypes.func,
  onIndexAddError: PropTypes.func,
};
