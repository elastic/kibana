/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useMemo } from 'react';
import { CommonProps, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { GLOBAL_EFFECT_SCOPE, POLICY_EFFECT_SCOPE } from './translations';
import { TextValueDisplay } from './text_value_display';
import { ContextMenuWithRouterSupport } from '../../context_menu_with_router_support';
import { ContextMenuItemNavByRouterProps } from '../../context_menu_with_router_support/context_menu_item_nav_by_router';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

// FIXME:PT support being able to show per policy label for Artifacst that have >0 policies, but no menu
//          the intent in this component was to also support to be able to display only text for artifacts
//          by policy (>0), but **NOT** show the menu.
//          So something like: `<EffectScope perPolicyCount={3} />`
//          This should dispaly it as "Applied t o 3 policies", but NOT as a menu with links

export interface EffectScopeProps extends Pick<CommonProps, 'data-test-subj'> {
  /** If set (even if empty), then effect scope will be policy specific. Else, it shows as global */
  policies?: ContextMenuItemNavByRouterProps[];
}

export const EffectScope = memo<EffectScopeProps>(
  ({ policies, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const [icon, label] = useMemo(() => {
      return policies
        ? ['partial', POLICY_EFFECT_SCOPE(policies.length)]
        : ['globe', GLOBAL_EFFECT_SCOPE];
    }, [policies]);

    const effectiveScopeLabel = (
      <EuiFlexGroup
        responsive={false}
        wrap={false}
        alignItems="center"
        gutterSize="s"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false} data-test-subj={getTestId('value')}>
          <TextValueDisplay>{label}</TextValueDisplay>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return policies && policies.length ? (
      <WithContextMenu policies={policies} data-test-subj={getTestId('popupMenu')}>
        {effectiveScopeLabel}
      </WithContextMenu>
    ) : (
      effectiveScopeLabel
    );
  }
);
EffectScope.displayName = 'EffectScope';

type WithContextMenuProps = Pick<CommonProps, 'data-test-subj'> &
  PropsWithChildren<{
    policies: Required<EffectScopeProps>['policies'];
  }>;

export const WithContextMenu = memo<WithContextMenuProps>(
  ({ policies, children, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <ContextMenuWithRouterSupport
        items={policies}
        anchorPosition="rightCenter"
        data-test-subj={dataTestSubj}
        button={
          <EuiButtonEmpty flush="both" size="s" data-test-subj={getTestId('button')}>
            {children}
          </EuiButtonEmpty>
        }
      />
    );
  }
);
WithContextMenu.displayName = 'WithContextMenu';
