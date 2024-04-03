/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorResponseV1 } from '../../../../../../common/routes/connector/response';
import { Connector } from '../../../../../application/connector/types';

export const transformGetConnectorResponse = ({
  actionTypeId,
  isPreconfigured,
  isMissingSecrets,
  isDeprecated,
  isSystemAction,
  ...res
}: Connector): ConnectorResponseV1 => ({
  ...res,
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_deprecated: isDeprecated,
  is_missing_secrets: isMissingSecrets,
  is_system_action: isSystemAction,
});
