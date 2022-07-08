/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../../shared/flash_messages';

import {
  UpdateConnectorSchedulingApiLogic,
  UpdateConnectorSchedulingArgs,
} from '../../../api/connector_package/update_connector_scheduling_api_logic';
import { ConnectorScheduling } from '../../../api/index/fetch_index_api_logic';

type ConnectorSchedulingActions = Pick<
  Actions<UpdateConnectorSchedulingArgs, ConnectorScheduling>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & { setHasChanges: (hasChanges: boolean) => { hasChanges: boolean } };

interface ConnectorSchedulingValues {
  hasChanges: boolean;
}

export const ConnectorSchedulingLogic = kea<
  MakeLogicType<ConnectorSchedulingValues, ConnectorSchedulingActions>
>({
  actions: {
    setHasChanges: (hasChanges) => ({ hasChanges }),
  },
  connect: {
    actions: [UpdateConnectorSchedulingApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
  },
  listeners: {
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: () =>
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.content.indices.configurationConnector.scheduling.successToast.title',
          { defaultMessage: 'Scheduling successfully updated' }
        )
      ),
    makeRequest: () => clearFlashMessages(),
  },
  reducers: {
    hasChanges: [
      false,
      {
        apiSuccess: () => false,
        setHasChanges: (_, { hasChanges }) => hasChanges,
      },
    ],
  },
});
