/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

import { CANVAS, JSON as JSONString } from '../../../../i18n/constants';
import { useNotifyService } from '../../../services';
import { getId } from '../../../lib/get_id';
import { useCreateWorkpad } from './use_create_workpad';
import type { CanvasWorkpad } from '../../../../types';

export const useImportWorkpad = () => {
  const notifyService = useNotifyService();
  const createWorkpad = useCreateWorkpad();

  return useCallback(
    (file?: File, onComplete: (workpad?: CanvasWorkpad) => void = () => {}) => {
      if (!file) {
        onComplete();
        return;
      }

      if (get(file, 'type') !== 'application/json') {
        notifyService.warning(errors.getAcceptJSONOnlyErrorMessage(), {
          title: file.name
            ? errors.getFileUploadFailureWithFileNameErrorMessage(file.name)
            : errors.getFileUploadFailureWithoutFileNameErrorMessage(),
        });
        onComplete();
      }

      // TODO: Clean up this file, this loading stuff can, and should be, abstracted
      const reader = new FileReader();

      // handle reading the uploaded file
      reader.onload = async () => {
        try {
          const workpad = JSON.parse(reader.result as string); // Type-casting because we catch below.
          workpad.id = getId('workpad');

          // sanity check for workpad object
          if (!Array.isArray(workpad.pages) || workpad.pages.length === 0 || !workpad.assets) {
            onComplete();
            throw new Error(errors.getMissingPropertiesErrorMessage());
          }

          await createWorkpad(workpad);
          onComplete(workpad);
        } catch (e) {
          notifyService.error(e, {
            title: file.name
              ? errors.getFileUploadFailureWithFileNameErrorMessage(file.name)
              : errors.getFileUploadFailureWithoutFileNameErrorMessage(),
          });
          onComplete();
        }
      };

      // read the uploaded file
      reader.readAsText(file);
    },
    [notifyService, createWorkpad]
  );
};

const errors = {
  getFileUploadFailureWithoutFileNameErrorMessage: () =>
    i18n.translate(
      'xpack.canvas.error.useImportWorkpad.fileUploadFailureWithoutFileNameErrorMessage',
      {
        defaultMessage: `Couldn't upload file`,
      }
    ),
  getFileUploadFailureWithFileNameErrorMessage: (fileName: string) =>
    i18n.translate('xpack.canvas.errors.useImportWorkpad.fileUploadFileWithFileNameErrorMessage', {
      defaultMessage: `Couldn't upload '{fileName}'`,
      values: {
        fileName,
      },
    }),
  getMissingPropertiesErrorMessage: () =>
    i18n.translate('xpack.canvas.error.useImportWorkpad.missingPropertiesErrorMessage', {
      defaultMessage:
        'Some properties required for a {CANVAS} workpad are missing.  Edit your {JSON} file to provide the correct property values, and try again.',
      values: {
        CANVAS,
        JSON: JSONString,
      },
    }),
  getAcceptJSONOnlyErrorMessage: () =>
    i18n.translate('xpack.canvas.error.useImportWorkpad.acceptJSONOnlyErrorMessage', {
      defaultMessage: 'Only {JSON} files are accepted',
      values: {
        JSON: JSONString,
      },
    }),
};
