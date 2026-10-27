/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ActionsContextMenu, type ActionGroups } from '../actions_context_menu';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from './ebt_constants';

/** Actions menu (⋮) of a table row. */
export function RowActionsMenu({ id, actions }: { id: string; actions: ActionGroups }) {
  return (
    <ActionsContextMenu
      id={id}
      actions={actions}
      dataTestSubjPrefix="requestFlyoutRowActions"
      button={
        // eslint-disable-next-line @elastic/eui/tooltip-button-icon-wrap -- ActionsContextMenu uses React.cloneElement to inject onClick on the button; wrapping with EuiToolTip would put onClick on the tooltip wrapper and break the popover trigger
        <EuiButtonIcon
          data-test-subj="requestFlyoutRowActionsButton"
          aria-label={i18n.translate('xpack.apm.requestFlyout.rowActionsAriaLabel', {
            defaultMessage: 'Actions',
          })}
          iconType="ellipsis"
          color="text"
          {...getEbtProps({
            action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
            element: REQUEST_FLYOUT_EBT_ELEMENTS.ROW_ACTIONS_MENU,
          })}
        />
      }
    />
  );
}
