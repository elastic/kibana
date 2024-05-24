/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { EcsFormStats } from '../../components/Ecs/EcsFormStats';
import { EcsButtons } from '../../components/Ecs/EcsButtons';
import { EcsForm } from '../../components/Ecs/EcsForm';
import { EcsTable } from '../../components/Ecs/EcsTable';

export const EcsMapperPage = () => {
  const ecsMappingTableState = useGlobalStore((state) => state.ecsMappingTableState);
  return (
    <EuiPageTemplate.Section alignment="center">
      {ecsMappingTableState.length <= 0 && <EcsForm />}
      {ecsMappingTableState.length >= 1 && (
        <>
          <EcsFormStats />
          <EuiSpacer />
          <EcsTable />
          <EuiSpacer />
          <EcsButtons />
        </>
      )}
    </EuiPageTemplate.Section>
  );
};
