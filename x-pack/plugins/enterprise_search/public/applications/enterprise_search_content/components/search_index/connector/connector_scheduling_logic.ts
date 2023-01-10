/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ConnectorScheduling } from '../../../../../../common/types/connectors';
import { Actions } from '../../../../shared/api_logic/create_api_logic';

import {
  UpdateConnectorSchedulingApiLogic,
  UpdateConnectorSchedulingArgs,
} from '../../../api/connector/update_connector_scheduling_api_logic';

type ConnectorSchedulingActions = Pick<
  Actions<UpdateConnectorSchedulingArgs, ConnectorScheduling>,
  'apiSuccess'
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
    actions: [UpdateConnectorSchedulingApiLogic, ['apiSuccess']],
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
