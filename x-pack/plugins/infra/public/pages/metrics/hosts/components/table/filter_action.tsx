/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonEmpty } from '@elastic/eui';

const selectedHostsLabel = (selectedHostsCount: number) => {
  return i18n.translate('xpack.infra.hostsViewPage.table.selectedHostsButton', {
    values: { selectedHostsCount },
    defaultMessage:
      'Selected {selectedHostsCount} {selectedHostsCount, plural, =1 {host} other {hosts}}',
  });
};

interface HostsTableFilterActionProps {
  selectedItemsCount: number;
  filterSelectedHosts: () => void;
}

export const HostsTableFilterAction = ({
  selectedItemsCount,
  filterSelectedHosts,
}: HostsTableFilterActionProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      data-test-subj="bulkAction"
      panelPaddingSize="s"
      button={
        <EuiButtonEmpty
          data-test-subj="infraUseHostsTableButton"
          size="xs"
          iconSide="right"
          iconType="arrowDown"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        >
          {selectedHostsLabel(selectedItemsCount)}
        </EuiButtonEmpty>
      }
    >
      <EuiButtonEmpty
        data-test-subj="infraUseHostsTableHostsButton"
        iconType="filter"
        onClick={() => {
          filterSelectedHosts();
          setIsPopoverOpen(false);
        }}
      >
        {i18n.translate('xpack.infra.hostsViewPage.table.addFilter', {
          defaultMessage: 'Add filter',
        })}
      </EuiButtonEmpty>
    </EuiPopover>
  );
};
