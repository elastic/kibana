/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFilterGroup, EuiPopover, EuiPopoverTitle } from '@elastic/eui';

import { IContentSource } from 'workplace_search/types';

import SourceOptionItem from './SourceOptionItem';

interface IGroupRowSourcesDropdownProps {
  isPopoverOpen: boolean;
  numOptions: number;
  groupSources: IContentSource[];
  onButtonClick();
  closePopover();
}

export const GroupRowSourcesDropdown: React.FC<IGroupRowSourcesDropdownProps> = ({
  isPopoverOpen,
  numOptions,
  groupSources,
  onButtonClick,
  closePopover,
}) => {
  // TODO: Add keydown handler
  const toggleLink = (
    <a className="user-group-source--additional" onKeyDown={(e) => null} onClick={onButtonClick}>
      + {numOptions}
    </a>
  );
  const contentSourceCountHeading = <strong>{groupSources.length} Shared content sources</strong>;

  const sources = groupSources.map((source, index) => (
    <div className="euiFilterSelectItem user-group__item" key={index}>
      <SourceOptionItem source={groupSources.filter(({ id }) => id === source.id)[0]} />
    </div>
  ));

  return (
    <EuiFilterGroup className="user-group-source--additional__wrap">
      <EuiPopover
        button={toggleLink}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        withTitle={true}
      >
        <EuiPopoverTitle>{contentSourceCountHeading}</EuiPopoverTitle>
        <div className="euiFilterSelect__items">{sources}</div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
