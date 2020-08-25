/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { SourceIcon } from 'workplace_search/components';
import { MAX_TABLE_ROW_ICONS } from 'workplace_search/constants';

import { IContentSource } from 'workplace_search/types';

import GroupRowSourcesDropdown from './GroupRowSourcesDropdown';

interface IGroupSourcesProps {
  groupSources: IContentSource[];
}

export const GroupSources: React.FC<IGroupSourcesProps> = ({ groupSources }) => {
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
