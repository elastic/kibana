/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuProps } from '@elastic/eui/src/components/context_menu/context_menu';

export const TableRowActionsNested = React.memo<{ panels: EuiContextMenuProps['panels'] }>(
  ({ panels }) => {
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
            aria-label={i18n.translate('xpack.ingestManager.genericActionsMenuText', {
              defaultMessage: 'Open',
            })}
          />
        }
        isOpen={isOpen}
        closePopover={handleCloseMenu}
      >
        <EuiContextMenu panels={panels} initialPanelId={0} />
      </EuiPopover>
    );
  }
);
