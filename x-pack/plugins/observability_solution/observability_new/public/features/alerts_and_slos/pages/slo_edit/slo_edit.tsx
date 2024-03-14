/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { useObservabilityRouter } from '../../../../hooks/use_router';
import ObservabilityPageTemplate from '../../../../components/page_template/page_template';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useCapabilities } from '../../hooks/slo/use_capabilities';
import { useFetchSloGlobalDiagnosis } from '../../hooks/slo/use_fetch_global_diagnosis';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { SloEditForm } from './components/slo_edit_form';

export function SloEditPage() {
  const { hasWriteCapabilities } = useCapabilities();
  const { isError: hasErrorInGlobalDiagnosis } = useFetchSloGlobalDiagnosis();
  const { link, push } = useObservabilityRouter();

  const { sloId } = useParams<{ sloId: string | undefined }>();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');
  const { data: slo } = useFetchSloDetails({ sloId });

  useBreadcrumbs([
    {
      href: link('/slos'),
      text: i18n.translate('xpack.observability.breadcrumbs.sloLabel', {
        defaultMessage: 'SLOs',
      }),
      deepLinkId: 'observability-new:slos',
    },
    ...(!!slo
      ? [
          {
            href: link('/slos/{sloId}', { path: { sloId: slo!.id }, query: {} }),
            text: slo!.name,
          },
        ]
      : []),
    {
      text: slo
        ? i18n.translate('xpack.observability.breadcrumbs.sloEditLabel', {
            defaultMessage: 'Edit',
          })
        : i18n.translate('xpack.observability.breadcrumbs.sloCreateLabel', {
            defaultMessage: 'Create',
          }),
    },
  ]);

  if (hasRightLicense === false || !hasWriteCapabilities || hasErrorInGlobalDiagnosis) {
    push('/slos', { path: '', query: '' });
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
        bottomBorder: false,
      }}
      data-test-subj="slosEditPage"
    >
      <HeaderMenu />
      <SloEditForm slo={slo} />
    </ObservabilityPageTemplate>
  );
}
