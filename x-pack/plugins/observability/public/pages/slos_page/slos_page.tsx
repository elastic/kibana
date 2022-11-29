/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { ObservabilityAppServices } from '../../application/types';
import { paths } from '../../config';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import { isSloFeatureEnabled } from './helpers';
import PageNotFound from '../404';

export function SlosPage() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.slos),
      text: i18n.translate('xpack.observability.breadcrumbs.slosLinkText', {
        defaultMessage: 'SLOs',
      }),
    },
  ]);

  if (!isSloFeatureEnabled(config)) {
    return <PageNotFound />;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <div>SLOs</div>,
        rightSideItems: [],
        bottomBorder: true,
      }}
      data-test-subj="slosPage"
    >
      <h1>SLOs</h1>
    </ObservabilityPageTemplate>
  );
}
