/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REVIEW_RULE_UPGRADE_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { throttleRequests } from '../../../../../utils/throttle_requests';
import { PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS } from '../../constants';
import { reviewRuleUpgradeHandler } from './review_rule_upgrade_handler';

export const reviewRuleUpgradeRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: REVIEW_RULE_UPGRADE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        timeout: {
          idleSocket: PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      throttleRequests(reviewRuleUpgradeHandler, { spaceAware: true })
    );
};
