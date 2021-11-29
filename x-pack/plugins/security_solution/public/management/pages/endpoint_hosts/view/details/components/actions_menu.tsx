/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiContextMenuPanel, EuiButton, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEndpointActionItems, useEndpointSelector } from '../../hooks';
import { detailsData } from '../../../store/selectors';
import { ContextMenuItemNavByRouter } from '../../../../../components/context_menu_with_router_support/context_menu_item_nav_by_router';

export const ActionsMenu = React.memo<{}>(() => {
  const endpointDetails = useEndpointSelector(detailsData);
  const menuOptions = useEndpointActionItems(endpointDetails);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopoverHandler = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const takeActionItems = useMemo(() => {
    return menuOptions.map((item) => {
      return <ContextMenuItemNavByRouter {...item} onClick={closePopoverHandler} />;
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
    >
      <EuiContextMenuPanel size="s" items={takeActionItems} />
    </EuiPopover>
  );
});

ActionsMenu.displayName = 'ActionMenu';
