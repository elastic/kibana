/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFilePicker,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseFile } from '../util/file_parser';
import _ from 'lodash';

export let fileToImport;

export function FileUploadAndParse({ previewFile }) {
  return (
    <EuiFormRow
      label={(
        <FormattedMessage
          id="xpack.maps.sources.clientFileSource.filePickerLabel"
          defaultMessage="Please select a GEOJson file to import"
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
          fileToImport = fileToImport;
          if (fileToImport && previewFile) {
            const defaultLayerName = _.get(fileToImport, 'name', 'fileToImport');
            const parsedFile = await parseFile(fileToImport);
            // Callback to preview file if needed
            previewFile(parsedFile, defaultLayerName);
          }
        }}
      />
    </EuiFormRow>
  );
}

FileUploadAndParse.propTypes = {
  previewFile: PropTypes.func,
};
