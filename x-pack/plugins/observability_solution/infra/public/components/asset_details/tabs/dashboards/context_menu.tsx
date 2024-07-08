/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React from 'react';
import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';

interface Props {
  items: React.ReactNode[];
}

export function ContextMenu({ items }: Props) {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj="infraDashboardsContextMenuButton"
          display="base"
          size="s"
          iconType="boxesVertical"
          aria-label={i18n.translate('xpack.infra.assetDetails.dashboards.contextMenu.moreLabel', {
            defaultMessage: 'More',
          })}
          onClick={togglePopover}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        size="s"
        items={items.map((item, index) => (
          <EuiContextMenuItem key={index} size="s">
            {item}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
}
