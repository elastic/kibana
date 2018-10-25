/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { compose, withHandlers } from 'recompose';
import { injectI18n } from '@kbn/i18n/react';
import { notify } from '../../../lib/notify';
import { uploadWorkpad } from '../upload_workpad';
import { WorkpadDropzone as Component } from './workpad_dropzone';

const WorkpadDropzoneUI = compose(
  withHandlers({
    onDropAccepted: ({ onUpload }) => ([file]) => uploadWorkpad(file, onUpload),
    onDropRejected: ({ intl }) => ([file]) => {
      notify.warning(
        intl.formatMessage({
          id: 'xpack.canvas.workpadLoader.dropzone.fileTypeErrorMessage',
          defaultMessage: 'Only JSON files are accepted',
        }),
        {
          title: intl.formatMessage(
            {
              id: 'xpack.canvas.workpadLoader.dropzone.readFileErrorMessageTitle.fileErrorDetail',
              defaultMessage: "Couldn't upload '{fileName}'",
            },
            {
              fileName:
                file.name ||
                intl.formatMessage({
                  id: 'xpack.canvas.workpadLoader.dropzone.readFileErrorMessageTitle.fileNameText',
                  defaultMessage: 'file',
                }),
            }
          ),
        }
      );
    },
  })
)(Component);

WorkpadDropzoneUI.propTypes = {
  onUpload: PropTypes.func.isRequired,
};

export const WorkpadDropzone = injectI18n(WorkpadDropzoneUI);
