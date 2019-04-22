/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import { triggerIndexing } from '../util/indexing_service';
import { selectMappingsOptions } from '../util/geo_processing';
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

  // Local state for parsed and indexed files
  const [fileRef, setFileRef] = useState(null);
  const [parsedFile, setParsedFile] = useState(null);
  const [indexedFile, setIndexedFile] = useState(null);
  const [indexDataType, setIndexDataType] = useState('');
  const [indexName, setIndexName] = useState('');

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
  let mappingsOptions;
  if (typeof preIndexTransform === 'object') {
    mappingsOptions = preIndexTransform.options;
  } else {
    switch(preIndexTransform) {
      case 'geo':
        mappingsOptions = selectMappingsOptions;
        break;
      default:
        throw(`Index options for ${preIndexTransform} not defined`);
        return;
    }
  }
  // Default to first
  if (!indexDataType) {
    setIndexDataType(mappingsOptions[0].value);
  }

  return (
    <Fragment>
      <JsonIndexFilePicker
        {...{ ...props, fileRef, setFileRef, parsedFile, setParsedFile,
          setIndexedFile, indexName, preIndexTransform, indexDataType
        }}
      />
      <IndexSettings
        indexName={indexName}
        setIndexName={setIndexName}
        indexDataType={indexDataType}
        setIndexDataType={setIndexDataType}
        mappingsOptions={mappingsOptions}
      />
    </Fragment>
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
