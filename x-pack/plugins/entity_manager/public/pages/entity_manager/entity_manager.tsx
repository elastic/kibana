/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { paths } from '../../../common/locators/paths';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../hooks/use_kibana';
import { ENTITY_MANAGER_LABEL } from '../../../common/translations';
import { CreateEntityDefinitionBtn } from './components/create_entity_definition_btn';
import { BuiltInDefinitionNotice } from './components/built_in_definition_notice';
import { DefinitionListing } from './components/definition_listing';
import { EntitiesListing } from '../../components/entities_listing';

export function EntityManagerPage() {
  const {
    http: { basePath },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const [selectedTabId, setSelectedTabId] = useState('entities');

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.entities),
      text: ENTITY_MANAGER_LABEL,
      deepLinkId: 'entityManager',
    },
  ]);

  const tabs = useMemo(
    () => [
      {
        id: 'entities',
        name: i18n.translate('xpack.entityManager.overview.entitiesTabLabel', {
          defaultMessage: 'Entities',
        }),
        content: <EntitiesListing defaultPerPage={20} />,
      },
      {
        id: 'definitions',
        name: i18n.translate('xpack.entityManager.overview.definitionTabLabel', {
          defaultMessage: 'Definitions',
        }),
        content: <DefinitionListing />,
      },
    ],
    []
  );

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => ({
      key: index,
      onClick: () => onSelectedTabChanged(tab.id),
      isSelected: tab.id === selectedTabId,
      label: tab.name,
    }));
  };

  return (
    <ObservabilityPageTemplate
      data-test-subj="entitiesPage"
      pageHeader={{
        bottomBorder: true,
        pageTitle: ENTITY_MANAGER_LABEL,
        rightSideItems: [<CreateEntityDefinitionBtn />],
        tabs: renderTabs(),
      }}
    >
      <BuiltInDefinitionNotice />
      {selectedTabContent}
    </ObservabilityPageTemplate>
  );
}
