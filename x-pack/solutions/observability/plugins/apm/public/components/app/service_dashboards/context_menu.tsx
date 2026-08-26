/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

interface Props {
  items: React.ReactNode[];
}

export function ContextMenu({ items }: Props) {
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.apm.serviceDashboards.contextMenu.ariaLabel', {
        defaultMessage: 'More actions',
      })}
      button={
        <EuiToolTip
          content={i18n.translate('xpack.apm.serviceDashboards.contextMenu.moreLabel', {
            defaultMessage: 'More',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj="apmContextMenuButton"
            display="base"
            size="s"
            iconType="boxesVertical"
            aria-label={i18n.translate('xpack.apm.serviceDashboards.contextMenu.moreLabel', {
              defaultMessage: 'More',
            })}
            onClick={onButtonClick}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={items.map((item, index) => (
          <EuiContextMenuItem key={index}> {item}</EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
}
