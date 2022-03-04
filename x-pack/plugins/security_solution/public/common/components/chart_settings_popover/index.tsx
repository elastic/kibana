/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

interface Props {
  initialPanelId: string;
  isPopoverOpen: boolean;
  panels: EuiContextMenuPanelDescriptor[];
  setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChartSettingsPopoverComponent = ({
  initialPanelId,
  isPopoverOpen,
  panels,
  setIsPopoverOpen,
}: Props) => {
  const onButtonClick = useCallback(
    () => setIsPopoverOpen((isOpen) => !isOpen),
    [setIsPopoverOpen]
  );

  const closePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);

  const button = useMemo(
    () => (
      <EuiButtonIcon color="text" iconType="boxesHorizontal" onClick={onButtonClick} size="xs" />
    ),
    [onButtonClick]
  );

  return (
    <EuiPopover
      anchorPosition="downCenter"
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={initialPanelId} panels={panels} />
    </EuiPopover>
  );
};

ChartSettingsPopoverComponent.displayName = 'ChartSettingsPopoverComponent';

export const ChartSettingsPopover = React.memo(ChartSettingsPopoverComponent);
