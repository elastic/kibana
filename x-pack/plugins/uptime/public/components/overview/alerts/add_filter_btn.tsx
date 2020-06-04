/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { useFilterUpdate } from '../../../hooks/use_filter_update';
import * as labels from './translations';

interface Props {
  newFilters: string[];
  onNewFilter: (val: string) => void;
}

export const AddFilterButton: React.FC<Props> = ({ newFilters, onNewFilter }) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const { selectedFilters } = useFilterUpdate();

  const getSelectedItems = (fieldName: string) => selectedFilters.get(fieldName) || [];

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const items: JSX.Element[] = [];

  const allFilters = [
    { id: 'observer.geo.name', label: labels.LOCATION },
    { id: 'tags', label: labels.TAG },
    { id: 'url.port', label: labels.PORT },
    { id: 'monitor.type', label: labels.TYPE },
  ];

  allFilters.forEach((filter) => {
    if (getSelectedItems(filter.id)?.length === 0 && !newFilters.includes(filter.id)) {
      items.push(
        <EuiContextMenuItem
          data-test-subj={'uptimeAlertAddFilter.' + filter.id}
          key={filter.id}
          onClick={() => {
            closePopover();
            onNewFilter(filter.id);
          }}
        >
          {filter.label}
        </EuiContextMenuItem>
      );
    }
  });

  const button = (
    <EuiButtonEmpty
      data-test-subj="uptimeCreateAlertAddFilter"
      disabled={items.length === 0}
      iconType="plusInCircleFilled"
      onClick={onButtonClick}
    >
      {labels.ADD_FILTER}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      id="singlePanel"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
