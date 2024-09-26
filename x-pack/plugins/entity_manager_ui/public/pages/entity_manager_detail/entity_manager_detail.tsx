/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../hooks/use_kibana';
import { paths } from '../../../common/locators/paths';
import { ENTITY_MANAGER_LABEL } from '../../../common/translations';
import { useFetchEntityDefinition } from '../../hooks/use_fetch_entity_definition';
import { HeaderDetails } from './components/header_details';
import { Transforms } from './components/transforms';
import { DefinitionDetails } from './components/definition_details';
import { Entities } from './components/entities';

export function EntityManagerDetailPage() {
  const {
    http: { basePath },
  } = useKibana().services;

  const { entityId } = useParams<{ entityId: string }>();
  const { data: definition } = useFetchEntityDefinition({ id: entityId, includeState: true });

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.entities),
      text: ENTITY_MANAGER_LABEL,
      deepLinkId: 'entityManager',
    },
    {
      text: definition ? definition.name : entityId,
    },
  ]);

  const { ObservabilityPageTemplate } = usePluginContext();

  if (!definition) {
    return null; // TODO: loading screen goes here
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="entitiesPage"
      pageHeader={{
        pageTitle: definition?.name,
        rightSideItems: [],
        children: <HeaderDetails definition={definition} />,
      }}
    >
      <DefinitionDetails definition={definition} />
      <EuiSpacer size="l" />
      <Entities definition={definition} />
      <EuiSpacer size="l" />
      <Transforms definition={definition} />
    </ObservabilityPageTemplate>
  );
}
