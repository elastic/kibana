/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useParams } from 'react-router-dom';
import { FeedbackButton } from '../../components/slo/feedback_button/feedback_button';
import { paths } from '../../config/paths';
import { useFetchCompositeSloDetails } from '../../hooks/composite_slo/use_fetch_composite_slo_details';
import { useCapabilities } from '../../hooks/slo/use_capabilities';
import { useFetchSloGlobalDiagnosis } from '../../hooks/slo/use_fetch_global_diagnosis';
import { useLicense } from '../../hooks/use_license';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { CompositeSloForm } from './components/composite_slo_form';

export function CompositeSloEditPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { hasWriteCapabilities } = useCapabilities();
  const { isError: hasErrorInGlobalDiagnosis } = useFetchSloGlobalDiagnosis();
  const { ObservabilityPageTemplate } = usePluginContext();

  const { compositeSloId } = useParams<{ compositeSloId: string | undefined }>();

  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.observability.slos),
      text: i18n.translate('xpack.observability.breadcrumbs.compositeSlo', {
        defaultMessage: 'Composite SLOs',
      }),
    },
  ]);

  const { data: compositeSlo, isInitialLoading } = useFetchCompositeSloDetails({
    compositeSloId,
  });

  if (hasRightLicense === false || !hasWriteCapabilities || hasErrorInGlobalDiagnosis) {
    navigateToUrl(basePath.prepend(paths.observability.slos));
  }

  if (compositeSloId && isInitialLoading) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: compositeSlo
          ? i18n.translate('xpack.observability.compositeSloForm.editPageTitle', {
              defaultMessage: 'Edit composite SLO',
            })
          : i18n.translate('xpack.observability.compositeSloForm.createPageTitle', {
              defaultMessage: 'Create new composite SLO',
            }),
        rightSideItems: [<FeedbackButton />],
        bottomBorder: false,
      }}
      data-test-subj="compositeSloEditPage"
    >
      <CompositeSloForm compositeSlo={compositeSlo} />
    </ObservabilityPageTemplate>
  );
}
