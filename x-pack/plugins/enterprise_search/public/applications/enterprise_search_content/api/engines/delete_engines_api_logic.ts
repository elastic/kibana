/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';

export interface DeleteEnginesApiLogicArguments {
  engineName: string;
}
export interface DeleteEnginesApiLogicResponse {
  engineName: string;
}

export const deleteEngine = async ({
  engineName,
}: DeleteEnginesApiLogicArguments): Promise<DeleteEnginesApiLogicResponse> => {
  const route = `/internal/enterprise_search/engines/${engineName}`;
  await HttpLogic.values.http.delete<DeleteEnginesApiLogicResponse>(route);
  return { engineName };
};
export const DeleteEngineAPILogic = createApiLogic(
  ['content', 'delete_engine_api_logic'],
  deleteEngine,
  {
    showSuccessFlashFn: ({ engineName }) =>
      i18n.translate('xpack.enterpriseSearch.content.engineList.deleteEngine.successToast.title', {
        defaultMessage: '{engineName} has been deleted',
        values: {
          engineName,
        },
      }),
  }
);

export type DeleteEnginesApiLogicActions = Actions<
  DeleteEnginesApiLogicArguments,
  DeleteEnginesApiLogicResponse
>;
