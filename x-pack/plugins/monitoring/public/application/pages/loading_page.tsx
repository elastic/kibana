/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from './page_template';
import { PageLoading } from '../../components';
import { useClusters } from '../hooks/use_clusters';
import { CODE_PATH_ELASTICSEARCH } from '../../../common/constants';

const CODE_PATHS = [CODE_PATH_ELASTICSEARCH];

export const LoadingPage = ({ staticLoadingState }: { staticLoadingState?: boolean }) => {
  const { clusters, loaded } = useClusters(null, undefined, CODE_PATHS);
  const title = i18n.translate('xpack.monitoring.loading.pageTitle', {
    defaultMessage: 'Loading',
  });

  if (staticLoadingState) {
    return (
      <PageTemplate title={title}>
        <PageLoading />;
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title={title}>
      {loaded === false ? <PageLoading /> : renderRedirections(clusters)}
    </PageTemplate>
  );
};

const renderRedirections = (clusters: any) => {
  if (!clusters || !clusters.length) {
    return <Redirect to="/no-data" />;
  }
  if (clusters.length === 1) {
    // Bypass the cluster listing if there is just 1 cluster
    return <Redirect to="/overview" />;
  }

  return <Redirect to="/home" />;
};
