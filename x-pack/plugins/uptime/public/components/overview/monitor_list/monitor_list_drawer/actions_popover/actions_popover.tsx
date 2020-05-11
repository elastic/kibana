/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiPopover, EuiButton } from '@elastic/eui';
import { IntegrationGroup } from './integration_group';
import { MonitorSummary } from '../../../../../../common/runtime_types';
import { toggleIntegrationsPopover, PopoverState } from '../../../../../state/actions';

interface ActionsPopoverProps {
  summary: MonitorSummary;
  popoverState: PopoverState | null;
  togglePopoverIsVisible: typeof toggleIntegrationsPopover;
}

export const ActionsPopoverComponent = ({
  summary,
  popoverState,
  togglePopoverIsVisible,
}: ActionsPopoverProps) => {
  const popoverId = `${summary.monitor_id}_popover`;

  const monitorUrl: string | undefined = get(summary, 'state.url.full', undefined);
  const isPopoverOpen: boolean =
    !!popoverState && popoverState.open && popoverState.id === popoverId;
  return (
    <EuiPopover
      button={
        <EuiButton
          aria-label={i18n.translate(
            'xpack.uptime.monitorList.observabilityIntegrationsColumn.popoverIconButton.ariaLabel',
            {
              defaultMessage: 'Opens integrations popover for monitor with url {monitorUrl}',
              description:
                'A message explaining that this button opens a popover with links to other apps for a given monitor',
              values: { monitorUrl },
            }
          )}
          data-test-subj={`xpack.uptime.monitorList.actionsPopover.${summary.monitor_id}`}
          onClick={() => togglePopoverIsVisible({ id: popoverId, open: true })}
          iconType="arrowDown"
          iconSide="right"
        >
          Integrations
        </EuiButton>
      }
      closePopover={() => togglePopoverIsVisible({ id: popoverId, open: false })}
      id={popoverId}
      isOpen={isPopoverOpen}
    >
      <IntegrationGroup summary={summary} />
    </EuiPopover>
  );
};
