/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { paths } from '../../config';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import { SloEditForm } from './components/slo_edit_form';
import PageNotFound from '../404';
import { isSloFeatureEnabled } from '../slos/helpers/is_slo_feature_enabled';

export function SloEditPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();

  const { sloId } = useParams<{ sloId: string | undefined }>();

  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.observability.slos),
      text: i18n.translate('xpack.observability.breadcrumbs.sloEditLinkText', {
        defaultMessage: 'SLOs',
      }),
    },
  ]);

  const { slo, loading } = useFetchSloDetails(sloId);

  if (!isSloFeatureEnabled(config)) {
    return <PageNotFound />;
  }

  console.log('hasRightLicense', hasRightLicense);

  if (hasRightLicense === false) {
    navigateToUrl(basePath.prepend(paths.observability.slos));
  }

  if (loading) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: slo
          ? i18n.translate('xpack.observability.sloEditPageTitle', {
              defaultMessage: 'Edit SLO',
            })
          : i18n.translate('xpack.observability.sloCreatePageTitle', {
              defaultMessage: 'Create new SLO',
            }),
        rightSideItems: [],
        bottomBorder: false,
      }}
      data-test-subj="slosEditPage"
    >
      <SloEditForm slo={slo} />
    </ObservabilityPageTemplate>
  );
}
