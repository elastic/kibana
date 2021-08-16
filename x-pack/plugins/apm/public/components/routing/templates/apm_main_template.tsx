/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  useKibana,
  KibanaPageTemplateProps,
} from '../../../../../../../src/plugins/kibana_react/public';
import { ApmPluginStartDeps } from '../../../plugin';
import { EnvironmentFilter } from '../../shared/EnvironmentFilter';

/*
 * This template contains:
 *  - The Shared Observability Nav (https://github.com/elastic/kibana/blob/f7698bd8aa8787d683c728300ba4ca52b202369c/x-pack/plugins/observability/public/components/shared/page_template/README.md)
 *  - The APM Header Action Menu
 *  - Page title
 *
 *  Optionally:
 *   - EnvironmentFilter
 */
export function ApmMainTemplate({
  pageTitle,
  pageHeader,
  children,
  ...pageTemplateProps
}: {
  pageTitle?: React.ReactNode;
  pageHeader?: EuiPageHeaderProps;
  children: React.ReactNode;
} & KibanaPageTemplateProps) {
  const { http, docLinks } = useKibana().services;
  const basePath = http?.basePath.get();
  const { services } = useKibana<ApmPluginStartDeps>();

  const ObservabilityPageTemplate =
    services.observability.navigation.PageTemplate;

  // TODO: NEEDS A DATA CHECK
  const hasData = true;
  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] = !hasData
    ? {
        solution: i18n.translate('xpack.apm.noDataConfig.solutionName', {
          defaultMessage: 'Observability',
        }),
        actions: {
          beats: {
            title: i18n.translate('xpack.apm.noDataConfig.beatsCard.title', {
              defaultMessage: 'Add data with APM agents',
            }),
            description: i18n.translate(
              'xpack.apm.noDataConfig.beatsCard.description',
              {
                defaultMessage:
                  'Use APM agents to collect APM data. We make it easy with agents for many popular languages.',
              }
            ),
            href: basePath + `/app/home#/tutorial/apm`,
          },
        },
        docsLink: docLinks!.links.observability.guide,
      }
    : undefined;

  // TODO: GET A CHECK
  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={{
        pageTitle,
        rightSideItems: [<EnvironmentFilter />],
        ...pageHeader,
      }}
      {...pageTemplateProps}
    >
      {children}
    </ObservabilityPageTemplate>
  );
}
