/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { GroupLogic, IGroupActions, IGroupValues } from '../GroupLogic';
import { GroupsLogic, IGroupsValues } from '../GroupsLogic';

import GroupManagerModal from './GroupManagerModal';
import SourcesList from './SourcesList';

export const SharedSourcesModal: React.FC = () => {
  const {
    addGroupSource,
    selectAllSources,
    hideSharedSourcesModal,
    removeGroupSource,
    saveGroupSources,
  } = useActions(GroupLogic) as IGroupActions;

  const { selectedGroupSources, group } = useValues(GroupLogic) as IGroupValues;

  const { contentSources } = useValues(GroupsLogic) as IGroupsValues;

  return (
    <GroupManagerModal
      label="shared content sources"
      allItems={contentSources}
      numSelected={selectedGroupSources.length}
      hideModal={hideSharedSourcesModal}
      selectAll={selectAllSources}
      saveItems={saveGroupSources}
    >
      <>
        <p>Select content sources to share with {group.name}</p>
        <SourcesList
          contentSources={contentSources}
          filteredSources={selectedGroupSources}
          addFilteredSource={addGroupSource}
          removeFilteredSource={removeGroupSource}
        />
      </>
    </GroupManagerModal>
  );
};
