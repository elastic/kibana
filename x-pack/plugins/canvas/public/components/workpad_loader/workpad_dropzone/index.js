/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { compose, withHandlers } from 'recompose';
import { uploadWorkpad } from '../upload_workpad';
import { ErrorStrings } from '../../../../i18n';
import { WorkpadDropzone as Component } from './workpad_dropzone';

const { WorkpadFileUpload: errors } = ErrorStrings;

export const WorkpadDropzone = compose(
  withHandlers(({ notify }) => ({
    onDropAccepted: ({ onUpload }) => ([file]) => uploadWorkpad(file, onUpload),
    onDropRejected: () => ([file]) => {
      notify.warning(errors.getAcceptJSONOnlyErrorMessage(), {
        title: file.name
          ? errors.getFileUploadFailureWithFileNameErrorMessage(file.name)
          : errors.getFileUploadFailureWithoutFileNameErrorMessage(),
      });
    },
  }))
)(Component);

WorkpadDropzone.propTypes = {
  onUpload: PropTypes.func.isRequired,
};
