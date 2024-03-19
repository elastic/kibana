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
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';
import { paths } from '../../../common/locators/paths';
import { useCapabilities } from '../../hooks/use_capabilities';
import { useFetchSloGlobalDiagnosis } from '../../hooks/use_fetch_global_diagnosis';
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { SloEditForm } from './components/slo_edit_form';

export function SloEditPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { hasWriteCapabilities } = useCapabilities();
  const { isError: hasErrorInGlobalDiagnosis } = useFetchSloGlobalDiagnosis();
  const { ObservabilityPageTemplate } = usePluginContext();

  const { sloId } = useParams<{ sloId: string | undefined }>();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');
  const { data: slo } = useFetchSloDetails({ sloId });

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.slos),
      text: i18n.translate('xpack.slo.breadcrumbs.sloLabel', {
        defaultMessage: 'SLOs',
      }),
      deepLinkId: 'slo',
    },
    ...(!!slo
      ? [
          {
            href: basePath.prepend(paths.sloDetails(slo!.id)),
            text: slo!.name,
          },
        ]
      : []),
    {
      text: slo
        ? i18n.translate('xpack.slo.breadcrumbs.sloEditLabel', {
            defaultMessage: 'Edit',
          })
        : i18n.translate('xpack.slo.breadcrumbs.sloCreateLabel', {
            defaultMessage: 'Create',
          }),
    },
  ]);

  if (hasRightLicense === false || !hasWriteCapabilities || hasErrorInGlobalDiagnosis) {
    navigateToUrl(basePath.prepend(paths.slos));
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: slo
          ? i18n.translate('xpack.slo.sloEditPageTitle', {
              defaultMessage: 'Edit SLO',
            })
          : i18n.translate('xpack.slo.sloCreatePageTitle', {
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
