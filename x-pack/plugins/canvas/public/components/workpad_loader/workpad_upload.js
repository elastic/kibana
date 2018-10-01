/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFilePicker } from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { getId } from '../../lib/get_id';
import { notify } from '../../lib/notify';

const WorkpadUploadUI = ({ onUpload, intl }) => (
  <EuiFilePicker
    compressed
    initialPromptText={
      <FormattedMessage
        id="xpack.canvas.workpadLoader.workpadUpload.importWorkpadJsonFileMessage"
        defaultMessage="Import workpad JSON file"
      />
    }
    onChange={([file]) => {
      if (get(file, 'type') !== 'application/json') {
        return notify.warning(
          intl.formatMessage({
            id: 'xpack.canvas.workpadLoader.workpadUpload.fileTypeErrorMessage',
            defaultMessage: 'Only JSON files are accepted',
          }),
          {
            title: file.name
              ? intl.formatMessage(
                  {
                    id: 'xpack.canvas.workpadLoader.workpadUpload.fileTypeErrorMessageTitle',
                    defaultMessage: "Couldn't upload '{fileName}'",
                  },
                  { fileName: file.name }
                )
              : intl.formatMessage({
                  id: 'xpack.canvas.workpadLoader.workpadUpload.commonFileTypeErrorMessageTitle',
                  defaultMessage: "Couldn't upload 'file'",
                }),
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
            title: file.name
              ? intl.formatMessage(
                  {
                    id: 'xpack.canvas.workpadLoader.workpadUpload.readingFileErrorMessageTitle',
                    defaultMessage: "Couldn't upload '{fileName}'",
                  },
                  { fileName: file.name }
                )
              : intl.formatMessage({
                  id: 'xpack.canvas.workpadLoader.workpadUpload.readingCommonFileErrorMessageTitle',
                  defaultMessage: "Couldn't upload 'file'",
                }),
          });
        }
      };

      // read the uploaded file
      reader.readAsText(file);
    }}
  />
);

WorkpadUploadUI.propTypes = {
  onUpload: PropTypes.func.isRequired,
};

export const WorkpadUpload = injectI18n(WorkpadUploadUI);
