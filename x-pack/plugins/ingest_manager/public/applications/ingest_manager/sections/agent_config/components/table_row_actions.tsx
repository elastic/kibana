/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuPanelProps } from '@elastic/eui/src/components/context_menu/context_menu_panel';

export const TableRowActions = React.memo<{ items: EuiContextMenuPanelProps['items'] }>(
  ({ items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
    const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

    return (
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        button={
          <EuiButtonIcon
            iconType="boxesHorizontal"
            onClick={handleToggleMenu}
            aria-label={i18n.translate('xpack.ingestManager.agentConfigList.actionsMenuText', {
              defaultMessage: 'Open',
            })}
          />
        }
        isOpen={isOpen}
        closePopover={handleCloseMenu}
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    );
  }
);
