/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HostMetadata } from '../../../../../../../common/endpoint/types';
import { useEndpointActionItems } from '../../hooks';
import { ContextMenuItemNavByRouter } from '../../../../../components/context_menu_with_router_support/context_menu_item_nav_by_router';

export const ActionsMenu = memo<{ hostMetadata: HostMetadata }>(({ hostMetadata }) => {
  const menuOptions = useEndpointActionItems(hostMetadata);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopoverHandler = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const takeActionItems = useMemo(() => {
    return menuOptions.map((item) => {
      return (
        <ContextMenuItemNavByRouter
          {...item}
          onClick={(ev) => {
            closePopoverHandler();
            if (item.onClick) {
              item.onClick(ev);
            }
          }}
        />
      );
    });
  }, [closePopoverHandler, menuOptions]);

  const takeActionButton = useMemo(() => {
    return (
      <EuiButton
        iconSide="right"
        fill
        iconType="arrowDown"
        data-test-subj="endpointDetailsActionsButton"
        onClick={() => {
          setIsPopoverOpen(!isPopoverOpen);
        }}
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.detailsActions.buttonLabel"
          defaultMessage="Take action"
        />
      </EuiButton>
    );
  }, [isPopoverOpen]);

  return (
    <EuiPopover
      id="endpointDetailsActionsPanel"
      button={takeActionButton}
      isOpen={isPopoverOpen}
      closePopover={closePopoverHandler}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      data-test-subj="endpointDetailsActionsPopover"
    >
      <EuiContextMenuPanel size="s" items={takeActionItems} />
    </EuiPopover>
  );
});

ActionsMenu.displayName = 'ActionMenu';
