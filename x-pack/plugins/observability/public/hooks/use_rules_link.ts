/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLinkProps, Options, LinkProps } from './use_link_props';

export function useRulesLink(useNewRulePage = false, options?: Options): LinkProps {
  const linkProps = useNewRulePage
    ? {
        app: 'observability',
        pathname: '/rules',
      }
    : {
        app: 'management',
        pathname: '/insightsAndAlerting/triggersActions/alerts',
      };

  return useLinkProps(linkProps, options);
}
