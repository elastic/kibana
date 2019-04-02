/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFilePicker,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseFile } from '../util/file_parser';
import { triggerIndexing } from '../util/indexing_service';
import _ from 'lodash';

export function JsonUploadAndParse({ previewFile, defaultMessage, postProcessing, boolIndexData = false }) {

  const [parsedFile, setParsedFile] = useState(null);
  const [indexedFile, setIndexedFile] = useState(null);

  if (boolIndexData && !_.isEqual(indexedFile, parsedFile)) {
    triggerIndexing(parsedFile).then(() =>
      setIndexedFile(parsedFile)
    );
  }

  return (
    <EuiFormRow
      label={(
        <FormattedMessage
          id="xpack.maps.sources.clientFileSource.filePickerLabel"
          defaultMessage={defaultMessage || 'Please select a Json file to import'}
        />
      )}
    >
      <EuiFilePicker
        initialPromptText={(
          <FormattedMessage
            id="xpack.maps.sources.clientFileSource.filePicker"
            defaultMessage="Import"
          />
        )}
        onChange={async ([fileToImport]) => {
          const parsedFileResult = await parseFile(fileToImport, postProcessing);
          const defaultLayerName = _.get(fileToImport, 'name', 'fileToImport');
          if (fileToImport) {
            // Callback to preview file if needed
            if (previewFile) {
              previewFile(parsedFileResult, defaultLayerName);
            }
            if (boolIndexData) {
              triggerIndexing(parsedFileResult);
            }
          }
          setParsedFile(parsedFileResult);
        }}
      />
    </EuiFormRow>
  );
}

JsonUploadAndParse.propTypes = {
  previewFile: PropTypes.func,
  defaultMessage: PropTypes.string,
  postProcessing: PropTypes.func,
  boolIndexData: PropTypes.bool,
};
