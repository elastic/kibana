/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLinkProps, Options } from './use_link_props';

export function useRulesLink(options?: Options) {
  const manageRulesLinkProps = useLinkProps(
    {
      app: 'management',
      pathname: '/insightsAndAlerting/triggersActions/alerts',
    },
    options
  );

  return manageRulesLinkProps;
}
