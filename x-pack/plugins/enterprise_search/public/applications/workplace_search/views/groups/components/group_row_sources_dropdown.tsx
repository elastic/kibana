/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFilterGroup, EuiPopover, EuiPopoverTitle, EuiButtonEmpty } from '@elastic/eui';

import { IContentSource } from '../../../types';

import { SourceOptionItem } from './source_option_item';

interface IGroupRowSourcesDropdownProps {
  isPopoverOpen: boolean;
  numOptions: number;
  groupSources: IContentSource[];
  onButtonClick(): void;
  closePopover(): void;
}

export const GroupRowSourcesDropdown: React.FC<IGroupRowSourcesDropdownProps> = ({
  isPopoverOpen,
  numOptions,
  groupSources,
  onButtonClick,
  closePopover,
}) => {
  const toggleLink = (
    <EuiButtonEmpty className="user-group-source--additional" onClick={onButtonClick}>
      + {numOptions}
    </EuiButtonEmpty>
  );
  const contentSourceCountHeading = (
    <strong>
      {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.contentSourceCountHeading', {
        defaultMessage: '{numSources} shared content sources',
        values: { numSources: groupSources.length },
      })}
    </strong>
  );

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
      >
        <EuiPopoverTitle>{contentSourceCountHeading}</EuiPopoverTitle>
        <div className="euiFilterSelect__items">{sources}</div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
