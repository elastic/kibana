/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { GroupLogic } from '../group_logic';
import { GroupsLogic } from '../groups_logic';

import { GroupManagerModal } from './group_manager_modal';
import { SourcesList } from './sources_list';

export const SharedSourcesModal: React.FC = () => {
  const {
    addGroupSource,
    selectAllSources,
    hideSharedSourcesModal,
    removeGroupSource,
    saveGroupSources,
  } = useActions(GroupLogic);

  const { selectedGroupSources, group } = useValues(GroupLogic);

  const { contentSources } = useValues(GroupsLogic);

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
