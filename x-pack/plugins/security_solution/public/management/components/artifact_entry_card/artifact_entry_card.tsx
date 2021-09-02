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
   * An object with policy names keyed by their `id`s. Used when the Artifact's `effectScope` is
   * per policy to display them in a popup menu
   */
  policyNames?: Record<string, string>;
}

/**
 * Display Artifact Items (ex. Trusted App, Event Filter, etc) as a card.
 * This component is a TS Generic that allows you to set what the Item type is
 */
export const ArtifactEntryCard = memo(
  <T extends AnyArtifact = AnyArtifact>({
    item,
    policyNames,
    actions,
    ...commonProps
  }: ArtifactEntryCardProps<T>) => {
    // FIXME: make component generic for the data type
    // FIXME: revisit all dev code below

    const policies = useMemo<EffectScopeProps['policies']>(() => {
      return item.effectScope.type === 'policy'
        ? item.effectScope.policies.map((id) => {
            return {
              id,
              name: policyNames ? policyNames[id] : id,
            };
          })
        : undefined;
    }, [item.effectScope.policies, item.effectScope.type, policyNames]);

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
            policies={policies}
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
