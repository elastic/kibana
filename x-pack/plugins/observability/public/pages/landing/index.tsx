/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTrackPageview } from '../../hooks/use_track_metric';
import { getNoDataConfig } from '../../utils/no_data_config';
import './styles.scss';

export function LandingPage() {
  useTrackPageview({ app: 'observability-overview', path: 'landing' });
  useTrackPageview({ app: 'observability-overview', path: 'landing', delay: 15000 });
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.landingLinkText', {
        defaultMessage: 'Getting started',
      }),
    },
  ]);

  const { core, ObservabilityPageTemplate } = usePluginContext();

  const noDataConfig = getNoDataConfig({
    // Set it to false because the landing page is only visible when there's no data
    hasData: false,
    basePath: core.http.basePath,
    docsLink: core.docLinks.links.observability.guide,
  });

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      restrictWidth
      // No side nav since nothing is setup
      showSolutionNav={false}
    />
  );
}
