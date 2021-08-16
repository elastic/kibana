/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
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
      docLinks,
    },
  } = useKibanaContextForPlugin();

  const { http } = useKibana().services;
  const basePath = http!.basePath.get();

  const { sourceStatus } = useLogSourceContext();
  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] =
    sourceStatus?.logIndexStatus !== 'missing'
      ? undefined
      : {
          solution: i18n.translate('xpack.infra.logs.noDataConfig.solutionName', {
            defaultMessage: 'Observability',
          }),
          actions: {
            beats: {
              title: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.title', {
                defaultMessage: 'Add logs with Beats',
              }),
              description: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.description', {
                defaultMessage:
                  'Use Beats to send logs to Elasticsearch. We make it easy with modules for many popular systems and apps.',
              }),
              href: basePath + `/app/home#/tutorial_directory/logging`,
            },
          },
          docsLink: docLinks.links.observability.guide,
        };

  return <PageTemplate noDataConfig={noDataConfig} {...pageTemplateProps} />;
};
