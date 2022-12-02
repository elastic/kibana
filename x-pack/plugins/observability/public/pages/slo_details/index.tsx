/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useParams } from 'react-router-dom';
import { ObservabilityAppServices } from '../../application/types';
import { paths } from '../../config';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import PageNotFound from '../404';
import { SLO_DETAILS_PAGE_TITLE } from './translations';
import { isSloFeatureEnabled } from '../slos/helpers';
import { SLOS_BREADCRUMB_TEXT } from '../slos/translations';
import { SloDetailsPathParams } from './types';
import { useFetchSloDetails } from './hooks';

export function SloDetails() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { sloId } = useParams<SloDetailsPathParams>();

  const [loading, slo] = useFetchSloDetails(sloId);

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.slos),
      text: SLOS_BREADCRUMB_TEXT,
    },
    {
      text: 'Details',
    },
  ]);

  if (!isSloFeatureEnabled(config) || slo === undefined) {
    return <PageNotFound />;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>{SLO_DETAILS_PAGE_TITLE}</>,
        rightSideItems: [],
        bottomBorder: true,
      }}
      data-test-subj="sloDetailsPage"
    >
      <></>
    </ObservabilityPageTemplate>
  );
}
