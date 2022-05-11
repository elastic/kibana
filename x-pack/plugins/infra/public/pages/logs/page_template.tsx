/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-plugin/public';
import { KibanaPageTemplateProps, useKibana } from '@kbn/kibana-react-plugin/public';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

interface LogsPageTemplateProps extends LazyObservabilityPageTemplateProps {
  hasData?: boolean;
}

export const LogsPageTemplate: React.FC<LogsPageTemplateProps> = ({
  hasData = true,
  'data-test-subj': _dataTestSubj,
  ...pageTemplateProps
}) => {
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

  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] = hasData
    ? undefined
    : {
        solution: i18n.translate('xpack.infra.logs.noDataConfig.solutionName', {
          defaultMessage: 'Observability',
        }),
        actions: {
          beats: {
            title: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.title', {
              defaultMessage: 'Add a logging integration',
            }),
            description: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.description', {
              defaultMessage:
                'Use the Elastic Agent or Beats to send logs to Elasticsearch. We make it easy with integrations for many popular systems and apps.',
            }),
            href: basePath + `/app/integrations/browse`,
          },
        },
        docsLink: docLinks.links.observability.guide,
      };

  return (
    <PageTemplate
      data-test-subj={hasData ? _dataTestSubj : 'noDataPage'}
      noDataConfig={noDataConfig}
      {...pageTemplateProps}
    />
  );
};
