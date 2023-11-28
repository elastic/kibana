/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import React from 'react';
import { EuiBreadcrumb } from '@elastic/eui';
import { datasetQualityAppTitle } from '@kbn/dataset-quality-plugin/public';
import { ObservabilityLogExplorerPageTemplate } from '../../components/page_template';
import { useBreadcrumbs } from '../../utils/breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

export interface DatasetQualityRouteProps {
  core: CoreStart;
}

export const DatasetQualityRoute = ({ core }: DatasetQualityRouteProps) => {
  const { services } = useKibanaContextForPlugin();
  const { serverless, datasetQuality: DatasetQuality } = services;
  const breadcrumb: EuiBreadcrumb[] = [
    {
      text: datasetQualityAppTitle,
    },
  ];

  useBreadcrumbs(breadcrumb, core.chrome, serverless);

  return (
    <ObservabilityLogExplorerPageTemplate pageProps={{ paddingSize: 'l' }}>
      <DatasetQuality.DatasetQuality />
    </ObservabilityLogExplorerPageTemplate>
  );
};
