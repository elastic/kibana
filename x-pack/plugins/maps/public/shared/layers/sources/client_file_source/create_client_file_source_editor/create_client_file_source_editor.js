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
import { importFile } from '../../../util/import_file';

export function ClientFileCreateSourceEditor(
  { previewGeojsonFile, removeTransientLayer }
) {
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
        onChange={async ([geojsonFile]) => {
          if (geojsonFile) {
            const defaultLayerName = geojsonFile.name;
            const parsedFile = await importFile(geojsonFile);
            previewGeojsonFile(parsedFile, defaultLayerName);
          } else {
            removeTransientLayer();
          }
        }}
      />
    </EuiFormRow>
  );
}

ClientFileCreateSourceEditor.propTypes = {
  previewGeojsonFile: PropTypes.func.isRequired
};