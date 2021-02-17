/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { GroupLogic } from '../group_logic';
import { GroupsLogic } from '../groups_logic';

import { GroupManagerModal } from './group_manager_modal';
import { SourcesList } from './sources_list';

const MODAL_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.sourcesModalLabel',
  {
    defaultMessage: 'shared content sources',
  }
);

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
      label={MODAL_LABEL}
      allItems={contentSources}
      numSelected={selectedGroupSources.length}
      hideModal={hideSharedSourcesModal}
      selectAll={selectAllSources}
      saveItems={saveGroupSources}
    >
      <>
        <p>
          {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.sourcesModalTitle', {
            defaultMessage: 'Select content sources to share with {groupName}',
            values: { groupName: group.name },
          })}
        </p>
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
