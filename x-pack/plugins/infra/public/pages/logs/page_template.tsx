/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import type { LazyObservabilityPageTemplateProps } from '../../../../observability/public';
import { useLogSourceContext } from '../../containers/logs/log_source';
import {
  KibanaPageTemplateProps,
  useKibana,
} from '../../../../../../src/plugins/kibana_react/public';

export const LogsPageTemplate: React.FC<LazyObservabilityPageTemplateProps> = (
  pageTemplateProps
) => {
  const {
    services: {
      observability: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();

  const { http } = useKibana().services;
  const basePath = http!.basePath.get();

  const { sourceStatus } = useLogSourceContext();
  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] =
    sourceStatus?.logIndexStatus !== 'missing'
      ? undefined
      : {
          solution: 'Observability',
          actions: {
            beats: {
              href: basePath + `/app/home#/tutorial_directory/logging`,
            },
          },
          docsLink: '#',
        };

  return <PageTemplate noDataConfig={noDataConfig} {...pageTemplateProps} />;
};
