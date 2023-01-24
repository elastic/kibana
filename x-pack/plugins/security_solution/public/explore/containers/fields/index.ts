/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import memoizeOne from 'memoize-one';
import { useKibana } from '../../../common/lib/kibana';

type FieldValidationCheck = (pattern: string, fieldsList: string[]) => Promise<boolean>;

export const useIsFieldInIndexPattern = (): FieldValidationCheck => {
  const { dataViews } = useKibana().services.data;
  return useMemo(
    () =>
      memoizeOne(
        async (pattern: string, fieldsList: string[]) => {
          const fields = await dataViews.getFieldsForWildcard({
            pattern,
            fields: fieldsList,
          });
          const fieldNames = fields.map((f) => f.name);
          return fieldsList.every((field) => fieldNames.includes(field));
        },
        (newArgs, lastArgs) =>
          newArgs[0] === lastArgs[0] && newArgs[1].join() === lastArgs[1].join()
      ),
    [dataViews]
  );
};
