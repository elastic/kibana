/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindConnectorResult } from '../../../../../application/connector/types';
import { ConnectorResponse } from '../../../../../../common/routes/connector/response';
import { RewriteResponseCase } from '../../../../../../common/rewrite_request_case';

export const transformGetAllConnectorsResponse: RewriteResponseCase<FindConnectorResult[]> = (
  results
): ConnectorResponse[] => {
  return results.map(
    ({
      actionTypeId,
      isPreconfigured,
      isDeprecated,
      referencedByCount,
      isMissingSecrets,
      isSystemAction,
      ...res
    }) => ({
      ...res,
      connector_type_id: actionTypeId,
      is_preconfigured: isPreconfigured,
      is_deprecated: isDeprecated,
      referenced_by_count: referencedByCount,
      is_missing_secrets: isMissingSecrets,
      is_system_action: isSystemAction,
    })
  );
};
