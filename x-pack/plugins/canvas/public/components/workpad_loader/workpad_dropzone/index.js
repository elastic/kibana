/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { compose, withState, withHandlers } from 'recompose';
import { injectI18n } from '@kbn/i18n/react';
import { getId } from '../../../lib/get_id';
import { notify } from '../../../lib/notify';
import { WorkpadDropzone as Component } from './workpad_dropzone';

const WorkpadDropzoneUI = compose(
  withState('isDropping', 'setDropping', false),
  withHandlers({
    onDropAccepted: ({ onUpload, setDropping }) => ([file]) => {
      // TODO: Clean up this file, this loading stuff can, and should be, abstracted
      const reader = new FileReader();

      // handle reading the uploaded file
      reader.onload = ({ intl }) => {
        try {
          const workpad = JSON.parse(reader.result);
          workpad.id = getId('workpad');
          onUpload(workpad);
        } catch (e) {
          notify.error(e, {
            title: intl.formatMessage(
              {
                id: 'xpack.canvas.workpadLoader.dropzone.loadFileErrorMessageTitle.fileErrorDetail',
                defaultMessage: "Couldn't upload '{fileName}'",
              },
              {
                fileName:
                  file.name ||
                  intl.formatMessage({
                    id:
                      'xpack.canvas.workpadLoader.dropzone.loadFileErrorMessageTitle.fileNameText',
                    defaultMessage: 'file',
                  }),
              }
            ),
          });
        }
      };

      // read the uploaded file
      reader.readAsText(file);
      setDropping(false);
    },
    onDropRejected: ({ setDropping, intl }) => ([file]) => {
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
      setDropping(false);
    },
  })
)(Component);

WorkpadDropzoneUI.propTypes = {
  onUpload: PropTypes.func.isRequired,
};

export const WorkpadDropzone = injectI18n(WorkpadDropzoneUI);
