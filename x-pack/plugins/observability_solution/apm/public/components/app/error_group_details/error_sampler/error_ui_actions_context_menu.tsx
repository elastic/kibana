/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';
import { ObservabilityActionContextMenuItemProps } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';

interface Props {
  items: ObservabilityActionContextMenuItemProps[];
}

export function ErrorUiActionsContextMenu({ items }: Props) {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  return (
    <EuiPopover
      id="errorContextMenu"
      button={
        <EuiButton
          data-test-subj="ErrorSampleDetailsButton"
          onClick={() => setIsContextMenuOpen((isOpen) => !isOpen)}
          iconType="arrowDown"
          iconSide="right"
        >
          {i18n.translate('xpack.apm.errorSampleDetails.investigateMenu', {
            defaultMessage: 'Investigate',
          })}
        </EuiButton>
      }
      isOpen={isContextMenuOpen}
      closePopover={() => setIsContextMenuOpen(() => false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId="mainMenu"
        panels={[
          {
            id: 'mainMenu',
            items: items as EuiContextMenuPanelItemDescriptor[],
          },
        ]}
      />
    </EuiPopover>
  );
}
