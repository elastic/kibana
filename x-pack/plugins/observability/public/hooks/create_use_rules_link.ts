/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UseLinkPropsOptions, useLinkProps } from '@kbn/observability-shared-plugin/public';

export const createUseRulesLink =
  () =>
  (options: UseLinkPropsOptions = {}) => {
    const linkProps = {
      app: 'observability',
      pathname: '/alerts/rules',
    };

    return useLinkProps(linkProps, options);
  };
