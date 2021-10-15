/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';

import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { ExceptionListClient } from '../../../../../lists/server';

const NON_EXPORTABLE_LIST_IDS = [ENDPOINT_LIST_ID];

export const getRuleExceptionsForExport = async (
  rules: Array<Partial<RulesSchema>>,
  exceptionsListClient: ExceptionListClient | undefined
): Promise<{ rules: Array<Partial<RulesSchema>>; exceptionLists: string | null }> => {
  const { rulesWithoutActions, exceptions } = rules.reduce<{
    rulesWithoutActions: Array<Partial<RulesSchema>>;
    exceptions: ListArray;
  }>(
    (rulesAndExceptions, rule) => ({
      // We do not support importing/exporting actions. When we do, delete this line of code
      rulesWithoutActions: [...rulesAndExceptions.rulesWithoutActions, { ...rule, actions: [] }],
      exceptions: [...rulesAndExceptions.exceptions, ...(rule.exceptions_list ?? [])],
    }),
    { rulesWithoutActions: [], exceptions: [] }
  );

  if (exceptionsListClient != null) {
    const exceptionsWithoutUnexportableLists = exceptions.filter(
      ({ list_id: listId }) => !NON_EXPORTABLE_LIST_IDS.includes(listId)
    );
    const exportReadyExceptions = await getExportableExceptions(
      exceptionsWithoutUnexportableLists,
      exceptionsListClient
    );

    return { rules: rulesWithoutActions, exceptionLists: exportReadyExceptions };
  } else {
    return { rules: rulesWithoutActions, exceptionLists: null };
  }
};

export const getExportableExceptions = async (
  exceptions: ListArray,
  exceptionsListClient: ExceptionListClient
): Promise<string> =>
  exceptions.reduce<Promise<string>>(
    async (accumulatorPromise, { id, list_id: listId, namespace_type: namespaceType }) => {
      return accumulatorPromise.then(
        (result) =>
          new Promise(async (resolve, reject) => {
            try {
              const exportString = await exceptionsListClient.exportExceptionListAndItems({
                id,
                listId,
                namespaceType,
              });

              if (exportString != null) {
                resolve(`${result}${exportString}`);
              } else {
                resolve(result);
              }
            } catch (error) {
              reject(error);
            }
          })
      );
    },
    Promise.resolve('')
  );
