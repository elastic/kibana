/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { compose, withHandlers } from 'recompose';
import { getId } from '../../../lib/get_id';
import { notify } from '../../../lib/notify';
import { WorkpadDropzone as Component } from './workpad_dropzone';

export const WorkpadDropzone = compose(
  withHandlers({
    onDropAccepted: ({ onUpload }) => ([file]) => {
      // TODO: Clean up this file, this loading stuff can, and should be, abstracted
      const reader = new FileReader();

      // handle reading the uploaded file
      reader.onload = () => {
        try {
          const workpad = JSON.parse(reader.result);
          workpad.id = getId('workpad');
          onUpload(workpad);
        } catch (e) {
          notify.error(e, { title: `Couldn't upload '${file.name || 'file'}'` });
        }
      };

      // read the uploaded file
      reader.readAsText(file);
    },
    onDropRejected: () => ([file]) => {
      notify.warning('Only JSON files are accepted', {
        title: `Couldn't upload '${file.name || 'file'}'`,
      });
    },
  })
)(Component);

WorkpadDropzone.propTypes = {
  onUpload: PropTypes.func.isRequired,
};
