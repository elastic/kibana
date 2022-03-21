/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Options, useLinkProps } from './use_link_props';

export function createUseRulesLink(isNewRuleManagementEnabled = false) {
  return function (options: Options = {}) {
    const linkProps = isNewRuleManagementEnabled
      ? {
          app: 'observability',
          pathname: '/rules',
        }
      : {
          app: 'management',
          pathname: '/insightsAndAlerting/triggersActions/rules',
        };
    return useLinkProps(linkProps, options);
  };
}
