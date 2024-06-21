/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButton,
  EuiListGroup,
  type EuiListGroupItemProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import React, { memo, useState } from 'react';

import type { AgentPolicy } from '../../common/types';
import { useLink } from '../hooks';
const MIN_WIDTH: CSSProperties = { minWidth: 0 };

export const MultipleAgentPoliciesSummaryLine = memo<{
  policies: AgentPolicy[];
  direction?: 'column' | 'row';
}>(({ policies, direction = 'row' }) => {
  const { getHref } = useLink();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  // as default, show only the first policy
  const policy = policies[0];
  const { name, id } = policy;

  const listItems: EuiListGroupItemProps[] = useMemo(() => {
    return policies.map((p) => {
      return {
        'data-test-subj': `policy-${p.id}`,
        label: p.name || p.id,
        href: getHref('policy_details', { policyId: p.id }),
        iconType: 'dot',
        extraAction: {
          color: 'text',
          iconType: p.is_managed ? 'lock' : '',
          alwaysShow: !!p.is_managed,
          iconSize: 's',
          'aria-label': 'Hosted agent policy',
        },
        showToolTip: !!p.is_managed,
        toolTipText: i18n.translate('xpack.fleet.agentPolicySummaryLine.hostedPolicyTooltip', {
          defaultMessage:
            'This policy is managed outside of Fleet. Most actions related to this policy are unavailable.',
        }),
      };
    });
  }, [getHref, policies]);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiFlexGroup
          direction={direction}
          gutterSize={direction === 'column' ? 'none' : 's'}
          alignItems="baseline"
          style={MIN_WIDTH}
          responsive={false}
          justifyContent={'flexStart'}
        >
          <EuiFlexItem grow={false} className="eui-textTruncate">
            <EuiFlexGroup style={MIN_WIDTH} gutterSize="s" alignItems="baseline" responsive={false}>
              <EuiFlexItem grow={false} className="eui-textTruncate">
                <EuiBadge color="default" data-test-subj="agentPolicyNameBadge">
                  {name || id}
                </EuiBadge>
              </EuiFlexItem>
              {policies.length > 1 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="hollow"
                    data-test-subj="agentPoliciesNumberBadge"
                    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                    onClickAriaLabel="Open agent policies popover"
                  >
                    {`+${policies.length - 1}`}
                  </EuiBadge>
                  <EuiPopover
                    data-test-subj="agentPoliciesPopover"
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    anchorPosition="downCenter"
                  >
                    <EuiPopoverTitle>
                      {i18n.translate('xpack.fleet.agentPolicySummaryLine.popover.title', {
                        defaultMessage: 'This integration is shared by',
                      })}
                    </EuiPopoverTitle>
                    <div style={{ width: '280px' }}>
                      <EuiListGroup
                        listItems={listItems}
                        color="primary"
                        size="s"
                        gutterSize="none"
                      />
                    </div>
                    <EuiPopoverFooter>
                      {/* TODO: implement missing onClick function */}
                      <EuiButton fullWidth size="s" data-test-subj="agentPoliciesPopoverButton">
                        {i18n.translate('xpack.fleet.agentPolicySummaryLine.popover.button', {
                          defaultMessage: 'Manage agent policies',
                        })}
                      </EuiButton>
                    </EuiPopoverFooter>
                  </EuiPopover>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
