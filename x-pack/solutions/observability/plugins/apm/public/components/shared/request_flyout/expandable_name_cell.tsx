/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiLink, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { REQUEST_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { REQUEST_FLYOUT_EBT_ACTIONS, REQUEST_FLYOUT_EBT_DETAILS } from './ebt_constants';

interface ExpandableNameCellProps {
  name: string;
  /** Whether the child flyout of this row is open. */
  isExpanded: boolean;
  onToggle: () => void;
  /** Which kind of row this is, reported with the click. */
  ebtElement: (typeof REQUEST_FLYOUT_EBT_ELEMENTS)[keyof typeof REQUEST_FLYOUT_EBT_ELEMENTS];
  'data-test-subj'?: string;
}

/**
 * Name cell that opens or closes the child flyout of a row: an expand / collapse icon next to
 * the name, like the transactions table of the service flyout. The name wraps instead of being
 * truncated because the child flyouts are narrow.
 */
export function ExpandableNameCell({
  name,
  isExpanded,
  onToggle,
  ebtElement,
  'data-test-subj': dataTestSubj,
}: ExpandableNameCellProps) {
  const label = isExpanded
    ? i18n.translate('xpack.apm.requestFlyout.expandableName.close', {
        defaultMessage: 'Close details',
      })
    : i18n.translate('xpack.apm.requestFlyout.expandableName.open', {
        defaultMessage: 'Open details',
      });

  const ebt = {
    action: REQUEST_FLYOUT_EBT_ACTIONS.VIEW_CHILD,
    element: ebtElement,
    detail: isExpanded ? REQUEST_FLYOUT_EBT_DETAILS.CLOSE : REQUEST_FLYOUT_EBT_DETAILS.OPEN,
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={label} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={dataTestSubj ? `${dataTestSubj}-expand` : undefined}
            aria-label={label}
            iconType={isExpanded ? 'minimize' : 'maximize'}
            color={isExpanded ? 'primary' : 'text'}
            size="xs"
            onClick={onToggle}
            {...getEbtProps(ebt)}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiLink
          data-test-subj={dataTestSubj}
          onClick={onToggle}
          css={{ textAlign: 'left', overflowWrap: 'anywhere' }}
          {...getEbtProps(ebt)}
        >
          {name}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
