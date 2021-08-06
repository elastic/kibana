/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import type { LazyObservabilityPageTemplateProps } from '../../../../observability/public';
import {
  NoDataPage,
  getKibanaNoDataPageTemplateProps,
} from '../../../../../../src/plugins/kibana_react/public';
import { Source } from '../../containers/metrics_source';
import { useLinkProps } from '../../hooks/use_link_props';

export const MetricsPageTemplate: React.FC<LazyObservabilityPageTemplateProps> = (
  pageTemplateProps
) => {
  const {
    services: {
      observability: {
        navigation: { PageTemplate },
      },
    },
  } = useKibanaContextForPlugin();

  const { metricIndicesExist } = useContext(Source.Context);

  const tutorialLinkProps = useLinkProps({
    app: 'home',
    hash: '/tutorial_directory/metrics',
  });

  return metricIndicesExist ? (
    <PageTemplate {...pageTemplateProps} />
  ) : (
    <PageTemplate {...getKibanaNoDataPageTemplateProps()}>
      <NoDataPage
        solution="Observability"
        actions={{
          elasticAgent: {
            href: 'app/integrations/browse',
            recommended: false,
          },
          beats: {
            ...tutorialLinkProps,
            recommended: true,
          },
        }}
        docsLink={'#'}
      />
    </PageTemplate>
  );
};
