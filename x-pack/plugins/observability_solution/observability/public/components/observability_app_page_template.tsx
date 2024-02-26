/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { usePluginContext } from '../hooks/use_plugin_context';

export function ObservabilityAppPageTemplate({
  children,
  ...rest
}: LazyObservabilityPageTemplateProps & {
  children: ReactNode;
}) {
  const { ObservabilityPageTemplate } = usePluginContext();
  return <ObservabilityPageTemplate {...rest}>{children}</ObservabilityPageTemplate>;
}
