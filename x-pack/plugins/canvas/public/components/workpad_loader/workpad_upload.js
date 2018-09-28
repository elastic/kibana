/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFilePicker } from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { getId } from '../../lib/get_id';
import { notify } from '../../lib/notify';

export const WorkpadUpload = ({ onUpload }) => (
  <EuiFilePicker
    compressed
    initialPromptText={
      <FormattedMessage
        id="xpack.canvas.workpad.upload.buttonTitle"
        defaultMessage="Import workpad JSON file"
      />
    }
    onChange={([file]) => {
      if (get(file, 'type') !== 'application/json') {
        return notify.warning(
          <FormattedMessage
            id="xpack.canvas.workpad.upload.fileTypeErrorMessage"
            defaultMessage="Only JSON files are accepted"
          />,
          {
            title: file.name ? (
              <FormattedMessage
                id="xpack.canvas.workpad.upload.fileTypeErrorTitle"
                defaultMessage="Couldn't upload {fileName}"
                values={{ fileName: file.name }}
              />
            ) : (
              <FormattedMessage
                id="xpack.canvas.workpad.upload.commonFileTypeErrorTitle"
                defaultMessage="Couldn't upload file"
              />
            ),
          }
        );
      }
      // TODO: Clean up this file, this loading stuff can, and should be, abstracted
      const reader = new FileReader();

      // handle reading the uploaded file
      reader.onload = () => {
        try {
          const workpad = JSON.parse(reader.result);
          workpad.id = getId('workpad');
          onUpload(workpad);
        } catch (e) {
          notify.error(e, {
            title: file.name ? (
              <FormattedMessage
                id="xpack.canvas.workpad.upload.fileReadingErrorTitle"
                defaultMessage="Couldn't upload {fileName}"
                values={{ fileName: file.name }}
              />
            ) : (
              <FormattedMessage
                id="xpack.canvas.workpad.upload.commonFileReadingErrorTitle"
                defaultMessage="Couldn't upload file"
              />
            ),
          });
        }
      };

      // read the uploaded file
      reader.readAsText(file);
    }}
  />
);

WorkpadUpload.propTypes = {
  onUpload: PropTypes.func.isRequired,
};
