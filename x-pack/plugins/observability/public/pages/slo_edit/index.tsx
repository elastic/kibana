/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { ObservabilityAppServices } from '../../application/types';
import { paths } from '../../config';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import { isSloFeatureEnabled } from '../slos/helpers';
import PageNotFound from '../404';
import { useFetchSlo } from '../../hooks/slo/use_fetch_slo';
import { SloEditForm } from './components/slo_edit_form';

export function SloEditPage() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();

  const { sloId } = useParams<{ sloId: string | undefined }>();

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.slos),
      text: i18n.translate('xpack.observability.breadcrumbs.sloEditLinkText', {
        defaultMessage: 'SLOs',
      }),
    },
  ]);

  console.log('sloId', sloId);
  const { slo, loading } = useFetchSlo({ id: sloId });

  if (!isSloFeatureEnabled(config)) {
    return <PageNotFound />;
  }

  if (loading) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.sloEditPageTitle', {
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
