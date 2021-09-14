/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { useAppContext } from '../../../../app_context';
import { EsStatsErrors } from './es_stats_error';
import { DeprecationIssuesPanel } from './deprecation_issues_panel';

interface Props {
  setIsFixed: (isFixed: boolean) => void;
}

export const ElasticsearchDeprecationStats: FunctionComponent<Props> = ({ setIsFixed }) => {
  const {
    services: { api },
  } = useAppContext();

  const { data: esDeprecations, isLoading, error } = api.useLoadEsDeprecations();

  const criticalDeprecationsCount =
    esDeprecations?.deprecations?.filter((deprecation) => deprecation.isCritical)?.length ?? 0;

  const warningDeprecationsCount =
    esDeprecations?.deprecations?.filter((deprecation) => deprecation.isCritical === false)
      ?.length ?? 0;

  const errorMessage = error && <EsStatsErrors error={error} />;

  return (
    <DeprecationIssuesPanel
      data-test-subj="esStatsPanel"
      deprecationSource="Elasticsearch"
      linkUrl="/es_deprecations"
      criticalDeprecationsCount={criticalDeprecationsCount}
      warningDeprecationsCount={warningDeprecationsCount}
      isLoading={isLoading}
      errorMessage={errorMessage}
      setIsFixed={setIsFixed}
    />
  );
};
