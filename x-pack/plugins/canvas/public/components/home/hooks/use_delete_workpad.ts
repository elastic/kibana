/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { useNotifyService, useWorkpadService } from '../../../services';
import { ErrorStrings } from '../../../../i18n';

const { workpadLoader: errors } = ErrorStrings;

export const useDeleteWorkpads = () => {
  const workpadService = useWorkpadService();
  const notifyService = useNotifyService();

  return useCallback(
    async (workpadIds: string[]) => {
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
          notifyService.error(errors.getDeleteFailureErrorMessage());
        }

        return {
          removedIds,
          errored,
        };
      });
    },
    [workpadService, notifyService]
  );
};
