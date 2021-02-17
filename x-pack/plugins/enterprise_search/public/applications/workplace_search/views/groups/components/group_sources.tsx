/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { SourceIcon } from '../../../components/shared/source_icon';
import { MAX_TABLE_ROW_ICONS } from '../../../constants';
import { ContentSource } from '../../../types';

import { GroupRowSourcesDropdown } from './group_row_sources_dropdown';

interface GroupSourcesProps {
  groupSources: ContentSource[];
}

export const GroupSources: React.FC<GroupSourcesProps> = ({ groupSources }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const closePopover = () => setPopoverOpen(false);
  const togglePopover = () => setPopoverOpen(!popoverOpen);
  const hiddenSources = [...groupSources];
  const visibleSources = hiddenSources.splice(0, MAX_TABLE_ROW_ICONS);

  return (
    <>
      {visibleSources.map((source, index) => (
        <SourceIcon {...source} wrapped key={index} />
      ))}
      {hiddenSources.length > 0 && (
        <GroupRowSourcesDropdown
          isPopoverOpen={popoverOpen}
          numOptions={hiddenSources.length}
          groupSources={groupSources}
          onButtonClick={togglePopover}
          closePopover={closePopover}
        />
      )}
    </>
  );
};
