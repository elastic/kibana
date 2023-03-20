/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiBreadcrumbProps } from '@elastic/eui/src/components/breadcrumbs/breadcrumb';
import { EuiButtonEmpty, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core-http-browser';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import PageNotFound from '../404';
import { SloDetails } from './components/slo_details';
import { HeaderTitle } from './components/header_title';
import { HeaderControl } from './components/header_control';
import { convertSliApmParamsToApmAppDeeplinkUrl } from './helpers/convert_sli_apm_params_to_apm_app_deeplink_url';
import { paths } from '../../config/paths';
import type { SloDetailsPathParams } from './types';
import type { ObservabilityAppServices } from '../../application/types';

export function SloDetailsPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  const { sloId } = useParams<SloDetailsPathParams>();
  const { isLoading, slo } = useFetchSloDetails(sloId);
  useBreadcrumbs(getBreadcrumbs(basePath, slo));

  const isSloNotFound = !isLoading && slo === undefined;
  if (isSloNotFound) {
    return <PageNotFound />;
  }

  if (hasRightLicense === false) {
    navigateToUrl(basePath.prepend(paths.observability.slos));
  }

  const handleNavigateToApm = () => {
    if (
      slo?.indicator.type === 'sli.apm.transactionDuration' ||
      slo?.indicator.type === 'sli.apm.transactionErrorRate'
    ) {
      const {
        indicator: {
          params: { environment, filter, service, transactionName, transactionType },
        },
        timeWindow: { duration },
      } = slo;

      const url = convertSliApmParamsToApmAppDeeplinkUrl({
        duration,
        environment,
        filter,
        service,
        transactionName,
        transactionType,
      });

      navigateToUrl(basePath.prepend(url));
    }
  };

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <HeaderTitle isLoading={isLoading} slo={slo} />,
        rightSideItems: [
          <HeaderControl isLoading={isLoading} slo={slo} />,
          slo?.indicator.type.includes('apm') ? (
            <EuiButtonEmpty
              data-test-subj="sloDetailsExploreInApmButton"
              disabled={isLoading}
              iconType="popout"
              onClick={handleNavigateToApm}
            >
              {i18n.translate('xpack.observability.slos.sloDetails.exploreInApm', {
                defaultMessage: 'Explore in APM',
              })}
            </EuiButtonEmpty>
          ) : null,
        ],
        bottomBorder: false,
      }}
      data-test-subj="sloDetailsPage"
    >
      {isLoading && <EuiLoadingSpinner data-test-subj="sloDetailsLoading" />}
      {!isLoading && <SloDetails slo={slo!} />}
    </ObservabilityPageTemplate>
  );
}

function getBreadcrumbs(
  basePath: IBasePath,
  slo: SLOWithSummaryResponse | undefined
): EuiBreadcrumbProps[] {
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
