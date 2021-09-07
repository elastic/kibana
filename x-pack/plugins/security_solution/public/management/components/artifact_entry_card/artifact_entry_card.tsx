/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { CommonProps, EuiHorizontalRule, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import styled from 'styled-components';
import { CardHeader, CardHeaderProps } from './components/card_header';
import { CardSubHeader } from './components/card_sub_header';
import { getEmptyValue } from '../../../common/components/empty_value';
import { CriteriaConditions } from './components/criteria_conditions';
import { EffectScopeProps } from './components/effect_scope';
import { TrustedApp } from '../../../../common/endpoint/types';
import { ContextMenuItemNavByRouterProps } from '../context_menu_with_router_support/context_menu_item_nav_by_rotuer';

const CardContainerPanel = styled(EuiPanel)`
  &.artifactEntryCard + &.artifactEntryCard {
    margin-top: ${({ theme }) => theme.eui.spacerSizes.l};
  }
`;

type AnyArtifact = ExceptionListItemSchema & TrustedApp;

export interface ArtifactEntryCardProps<T extends AnyArtifact = AnyArtifact> extends CommonProps {
  item: T;
  /**
   * The list of actions for the card. Will display an icon with the actions in a menu if defined.
   */
  actions?: CardHeaderProps['actions'];

  /**
   * Information about the policies that are assigned to the `item`'s `effectScope` and that will be
   * use to create a navigation link
   */
  policies?: {
    [policyId: string]: ContextMenuItemNavByRouterProps;
  };
}

/**
 * Display Artifact Items (ex. Trusted App, Event Filter, etc) as a card.
 * This component is a TS Generic that allows you to set what the Item type is
 */
export const ArtifactEntryCard = memo(
  <T extends AnyArtifact = AnyArtifact>({
    item,
    policies,
    actions,
    ...commonProps
  }: ArtifactEntryCardProps<T>) => {
    // FIXME: make component generic for the data type
    // FIXME: revisit all dev code below

    // create the policy links for each policy listed in the artifact record by grabbing the
    // navigation data from the `policies` prop (if any)
    const policyNavLinks = useMemo<EffectScopeProps['policies']>(() => {
      return item.effectScope.type === 'policy'
        ? item.effectScope.policies.map((id) => {
            return policies && policies[id]
              ? policies[id]
              : // else, unable to build a nav link, so just show id
                {
                  children: id,
                };
          })
        : undefined;
    }, [item.effectScope, policies]);

    return (
      <CardContainerPanel
        hasBorder={true}
        {...commonProps}
        paddingSize="none"
        className="artifactEntryCard"
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <CardHeader
            name={item.name}
            createdDate={item.created_at}
            updatedDate={item.updated_at}
            actions={actions}
          />
          <CardSubHeader
            createdBy={item.created_by}
            updatedBy={item.updated_by}
            policies={policyNavLinks}
          />

          <EuiSpacer size="m" />

          <EuiText>
            <p>{item.description || getEmptyValue()}</p>
          </EuiText>
        </EuiPanel>

        <EuiHorizontalRule margin="xs" />

        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <CriteriaConditions os={item.os} entries={item.entries} />
        </EuiPanel>
      </CardContainerPanel>
    );
  }
);

ArtifactEntryCard.displayName = 'ArtifactEntryCard';
