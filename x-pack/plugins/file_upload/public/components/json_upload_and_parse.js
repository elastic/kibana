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
import { triggerIndexing } from '../util/indexing_service';
import { getGeoIndexTypesForFeatures } from '../util/geo_processing';
import { IndexSettings } from './index_settings';
import { JsonIndexFilePicker } from './json_index_file_picker';
import _ from 'lodash';

export function JsonUploadAndParse(props) {
  const {
    boolIndexData = false,
    onIndexAddSuccess,
    onIndexAddError,
    preIndexTransform,
  } = props;

  // Local state for parsed file and indexed details
  const [fileRef, setFileRef] = useState(null);
  const [parsedFile, setParsedFile] = useState(null);
  const [indexedFile, setIndexedFile] = useState(null);
  const [indexDataType, setIndexDataType] = useState('');
  const [indexName, setIndexName] = useState('');
  const [indexPattern, setIndexPattern] = useState('');
  const [indexTypes, setIndexTypes] = useState([]);

  // If index flag set, index on update
  if (boolIndexData && parsedFile && !_.isEqual(indexedFile, parsedFile)) {
    triggerIndexing(parsedFile, preIndexTransform, indexName, indexDataType)
      .then(
        resp => {
          if (resp.success) {
            setIndexedFile(parsedFile);
            onIndexAddSuccess && onIndexAddSuccess(resp);
          } else {
            setIndexedFile(null);
            onIndexAddError && onIndexAddError();
          }
        });
  }

  // Determine index options
  useEffect(() => {
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
      // Default to first
      if (!indexDataType && indexTypes.length) {
        setIndexDataType(indexTypes[0].value);
      }
    }
  }, [parsedFile, preIndexTransform, indexDataType, indexTypes]);

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
