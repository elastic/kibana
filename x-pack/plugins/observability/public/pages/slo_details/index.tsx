/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiBreadcrumbProps } from '@elastic/eui/src/components/breadcrumbs/breadcrumb';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core-http-browser';
import type { SLOResponse } from '@kbn/slo-schema';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import PageNotFound from '../404';
import { isSloFeatureEnabled } from '../slos/helpers/is_slo_feature_enabled';
import { SloDetails } from './components/slo_details';
import { PageTitle } from './components/page_title';
import { paths } from '../../config';
import type { SloDetailsPathParams } from './types';
import type { ObservabilityAppServices } from '../../application/types';

export function SloDetailsPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana<ObservabilityAppServices>().services;

  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { sloId } = useParams<SloDetailsPathParams>();

  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  const { loading, slo } = useFetchSloDetails(sloId);

  useBreadcrumbs(getBreadcrumbs(basePath, slo));

  const isSloNotFound = !loading && slo === undefined;

  if (!isSloFeatureEnabled(config) || isSloNotFound) {
    return <PageNotFound />;
  }

  if (hasRightLicense === false) {
    navigateToUrl(basePath.prepend(paths.observability.slos));
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
      text: i18n.translate('xpack.observability.breadcrumbs.slosLinkText', {
        defaultMessage: 'SLOs',
      }),
    },
    {
      text:
        slo?.name ??
        i18n.translate('xpack.observability.breadcrumbs.sloDetailsLinkText', {
          defaultMessage: 'Details',
        }),
    },
  ];
}
