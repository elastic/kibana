/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { get } from 'lodash';

import { useNotifyService } from '../../../services';
import { ErrorStrings } from '../../../../i18n';
import { getId } from '../../../lib/get_id';
import type { CanvasWorkpad } from '../../../../types';

const { workpadLoader: errors } = ErrorStrings;

export const useImportWorkpad = () => {
  const notifyService = useNotifyService();

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
      reader.onload = () => {
        try {
          const workpad = JSON.parse(reader.result as string); // Type-casting because we catch below.
          workpad.id = getId('workpad');

          // sanity check for workpad object
          if (!Array.isArray(workpad.pages) || workpad.pages.length === 0 || !workpad.assets) {
            onComplete();
            throw new Error(errors.getMissingPropertiesErrorMessage());
          }

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
    [notifyService]
  );
};
