/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPopover, EuiIcon } from '@elastic/eui';
import React, { useCallback } from 'react';
import useToggle from 'react-use/lib/useToggle';

export function ColumnHeaderWithTooltip({
  label,
  tooltipContent,
}: {
  label: string;
  tooltipContent: string;
}) {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  const onButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      togglePopover();
    },
    [togglePopover]
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <div>{label}</div>
      <EuiPopover
        panelPaddingSize="s"
        button={
          <button
            onClick={onButtonClick}
            data-test-subj="apmViewTableColumnPopoverButton"
          >
            <EuiIcon type="questionInCircle" />
          </button>
        }
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        offset={10}
        anchorPosition="upCenter"
        panelStyle={{ maxWidth: 350 }}
      >
        {tooltipContent}
      </EuiPopover>
    </EuiFlexGroup>
  );
}
