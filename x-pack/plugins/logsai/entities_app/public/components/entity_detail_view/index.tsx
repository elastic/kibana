/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Entity } from '@kbn/entities-api-plugin/common';
import { PivotEntity } from '@kbn/entities-api-plugin/common/entities';
import React from 'react';
import { useEntitiesAppParams } from '../../hooks/use_entities_app_params';

interface TabDependencies {
  entity: Entity;
  pivot?: PivotEntity;
  dataStreams: Array<{ name: string }>;
}

interface Tab {
  name: string;
  label: string;
  content: React.ReactElement;
}

export function EntityDetailViewWithoutParams({
  tab,
  displayName,
  type,
  getAdditionalTabs,
}: {
  tab: string;
  displayName: string;
  type: string;
  getAdditionalTabs?: (dependencies: TabDependencies) => Tab[];
}) {
  return <></>;
}

export function EntityDetailView() {
  const {
    path: { type, displayName, tab },
  } = useEntitiesAppParams('/{type}/{displayName}/{tab}');

  return <EntityDetailViewWithoutParams type={type} displayName={displayName} tab={tab} />;
}
