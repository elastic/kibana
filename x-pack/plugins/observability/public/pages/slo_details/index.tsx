/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useParams } from 'react-router-dom';
import { IBasePath } from '@kbn/core-http-browser';
import { EuiBreadcrumbProps } from '@elastic/eui/src/components/breadcrumbs/breadcrumb';
import { EuiLoadingSpinner } from '@elastic/eui';
import { SLOResponse } from '@kbn/slo-schema';
import { ObservabilityAppServices } from '../../application/types';
import { paths } from '../../config';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import PageNotFound from '../404';
import { isSloFeatureEnabled } from '../slos/helpers/is_slo_feature_enabled';
import { SLOS_BREADCRUMB_TEXT } from '../slos/translations';
import { SloDetailsPathParams } from './types';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { SloDetails } from './components/slo_details';
import { SLO_DETAILS_BREADCRUMB_TEXT } from './translations';
import { PageTitle } from './components/page_title';

export function SloDetailsPage() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { sloId } = useParams<SloDetailsPathParams>();

  const { loading, slo } = useFetchSloDetails(sloId);
  useBreadcrumbs(getBreadcrumbs(http.basePath, slo));

  const isSloNotFound = !loading && slo === undefined;
  if (!isSloFeatureEnabled(config) || isSloNotFound) {
    return <PageNotFound />;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <PageTitle isLoading={loading} slo={slo} />,
        rightSideItems: [],
        bottomBorder: true,
      }}
      data-test-subj="sloDetailsPage"
    >
      {loading && <EuiLoadingSpinner data-test-subj="loadingDetails" />}
      {!loading && <SloDetails slo={slo!} />}
    </ObservabilityPageTemplate>
  );
}

function getBreadcrumbs(basePath: IBasePath, slo: SLOResponse | undefined): EuiBreadcrumbProps[] {
  return [
    {
      href: basePath.prepend(paths.observability.slos),
      text: SLOS_BREADCRUMB_TEXT,
    },
    {
      text: slo?.name ?? SLO_DETAILS_BREADCRUMB_TEXT,
    },
  ];
}
