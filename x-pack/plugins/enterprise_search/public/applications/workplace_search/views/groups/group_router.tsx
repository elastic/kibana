/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { GROUP_SOURCE_PRIORITIZATION_PATH, GROUP_PATH } from '../../routes';

import { GroupOverview } from './components/group_overview';
import { GroupSourcePrioritization } from './components/group_source_prioritization';
import { OrgSourcesModal } from './components/org_sources_modal';
import { GroupLogic } from './group_logic';

export const GroupRouter: React.FC = () => {
  const { groupId } = useParams() as { groupId: string };

  const { initializeGroup, resetGroup } = useActions(GroupLogic);
  const { orgSourcesModalVisible } = useValues(GroupLogic);

  useEffect(() => {
    initializeGroup(groupId);
    return resetGroup;
  }, []);

  return (
    <>
      <Routes>
        <Route path={GROUP_SOURCE_PRIORITIZATION_PATH}>
          <GroupSourcePrioritization />
        </Route>
        <Route path={GROUP_PATH}>
          <GroupOverview />
        </Route>
      </Routes>
      {orgSourcesModalVisible && <OrgSourcesModal />}
    </>
  );
};
