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
  const [fileRef, setFileRef] = useState(null);
  const [parsedFile, setParsedFile] = useState(null);

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
          if (fileToImport !== fileRef) {
            await setFileRef(fileToImport);
            console.log(fileRef, fileToImport);
            setParsedFile(await parseFile(fileRef, postProcessing));
          }
          const defaultLayerName = _.get(fileRef, 'name', 'fileToImport');
          if (fileRef) {
            // Callback to preview file if needed
            if (previewFile) {
              previewFile(parsedFile, defaultLayerName);
            }
            if (boolIndexData) {
              triggerIndexing(parsedFile);
            }
          }
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
