/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, withState, withHandlers } from 'recompose';
import { FormattedMessage } from '@kbn/i18n/react';
import { getId } from '../../../lib/get_id';
import { notify } from '../../../lib/notify';
import { WorkpadDropzone as Component } from './workpad_dropzone';

export const WorkpadDropzone = compose(
  withState('isDropping', 'setDropping', false),
  withHandlers({
    onDropAccepted: ({ onUpload, setDropping }) => ([file]) => {
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
                id="xpack.canvas.workpad.loader.dropzone.loadFileErrorTitle"
                defaultMessage="Couldn't upload {fileName}"
                values={{ fileName: file.name }}
              />
            ) : (
              <FormattedMessage
                id="xpack.canvas.workpad.loader.dropzone.commonLoadFileErrorTitle"
                defaultMessage="Couldn't upload file"
              />
            ),
          });
        }
      };

      // read the uploaded file
      reader.readAsText(file);
      setDropping(false);
    },
    onDropRejected: ({ setDropping }) => ([file]) => {
      notify.warning(
        <FormattedMessage
          id="xpack.canvas.workpad.loader.dropzone.fileTypeErrorMessage"
          defaultMessage="Only JSON files are accepted"
        />,
        {
          title: file.name ? (
            <FormattedMessage
              id="xpack.canvas.workpad.loader.dropzone.readFileErrorTitle"
              defaultMessage="Couldn't upload {fileName}"
              values={{ fileName: file.name }}
            />
          ) : (
            <FormattedMessage
              id="xpack.canvas.workpad.loader.dropzone.readCommonFileErrorTitle"
              defaultMessage="Couldn't upload file"
            />
          ),
        }
      );
      setDropping(false);
    },
  })
)(Component);

WorkpadDropzone.propTypes = {
  onUpload: PropTypes.func.isRequired,
};
