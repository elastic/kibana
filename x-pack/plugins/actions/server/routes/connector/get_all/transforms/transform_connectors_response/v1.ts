/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorWithExtraFindData } from '../../../../../application/connector/types';
import { AllConnectorsResponseV1 } from '../../../schemas/response';

export const transformGetAllConnectorsResponse = (
  results: ConnectorWithExtraFindData[]
): AllConnectorsResponseV1[] => {
  return results.map(
    ({
      id,
      name,
      config,
      actionTypeId,
      isPreconfigured,
      isDeprecated,
      referencedByCount,
      isMissingSecrets,
      isSystemAction,
    }) => ({
      id,
      name,
      config,
      connector_type_id: actionTypeId,
      is_preconfigured: isPreconfigured,
      is_deprecated: isDeprecated,
      referenced_by_count: referencedByCount,
      is_missing_secrets: isMissingSecrets,
      is_system_action: isSystemAction,
    })
  );
};
