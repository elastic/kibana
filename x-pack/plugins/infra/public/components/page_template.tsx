/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

export const PageTemplate: React.FC<LazyObservabilityPageTemplateProps> = (pageTemplateProps) => {
  const {
    services: {
      observability: {
        navigation: { PageTemplate: Template },
      },
    },
  } = useKibanaContextForPlugin();

  return <Template {...pageTemplateProps} />;
};
