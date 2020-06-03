/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiPopover,
  EuiButton,
} from '@elastic/eui';
import { EuiButtonProps } from '@elastic/eui/src/components/button/button';
import { EuiContextMenuProps } from '@elastic/eui/src/components/context_menu/context_menu';
import { EuiContextMenuPanelProps } from '@elastic/eui/src/components/context_menu/context_menu_panel';

type Props = {
  button?: {
    props: EuiButtonProps;
    children: JSX.Element;
  };
} & (
  | {
      items: EuiContextMenuPanelProps['items'];
    }
  | {
      panels: EuiContextMenuProps['panels'];
    }
);

export const ContextMenuActions = React.memo<Props>(({ button, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
  const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  return (
    <EuiPopover
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={
        button ? (
          <EuiButton {...button.props} onClick={handleToggleMenu}>
            {button.children}
          </EuiButton>
        ) : (
          <EuiButtonIcon
            iconType="boxesHorizontal"
            onClick={handleToggleMenu}
            aria-label={i18n.translate('xpack.ingestManager.genericActionsMenuText', {
              defaultMessage: 'Open',
            })}
          />
        )
      }
      isOpen={isOpen}
      closePopover={handleCloseMenu}
    >
      {'items' in props ? (
        <EuiContextMenuPanel items={props.items} />
      ) : (
        <EuiContextMenu panels={props.panels} initialPanelId={0} />
      )}
    </EuiPopover>
  );
});
