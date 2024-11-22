/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { getCanvasNotifyService } from '../../../services/canvas_notify_service';
import { getCanvasWorkpadService } from '../../../services/canvas_workpad_service';

export const useDeleteWorkpads = () => {
  return useCallback(async (workpadIds: string[]) => {
    const workpadService = getCanvasWorkpadService();

    const removedWorkpads = workpadIds.map(async (id) => {
      try {
        await workpadService.remove(id);
        return { id, err: null };
      } catch (err) {
        return { id, err };
      }
    });

    return Promise.all(removedWorkpads).then((results) => {
      const [passes, errored] = results.reduce<[string[], string[]]>(
        ([passesArr, errorsArr], result) => {
          if (result.err) {
            errorsArr.push(result.id);
          } else {
            passesArr.push(result.id);
          }

          return [passesArr, errorsArr];
        },
        [[], []]
      );

      const removedIds = workpadIds.filter((id) => passes.includes(id));

      if (errored.length > 0) {
        getCanvasNotifyService().error(errors.getDeleteFailureErrorMessage());
      }

      return {
        removedIds,
        errored,
      };
    });
  }, []);
};

const errors = {
  getDeleteFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.useDeleteWorkpads.deleteFailureErrorMessage', {
      defaultMessage: `Couldn't delete all workpads`,
    }),
};
