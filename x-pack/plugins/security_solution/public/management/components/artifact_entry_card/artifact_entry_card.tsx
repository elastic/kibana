/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { CommonProps, EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';
import { CardHeader, CardHeaderProps } from './components/card_header';
import { CardSubHeader } from './components/card_sub_header';
import { getEmptyValue } from '../../../common/components/empty_value';
import { CriteriaConditions, CriteriaConditionsProps } from './components/criteria_conditions';
import { EffectScopeProps } from './components/effect_scope';
import { ContextMenuItemNavByRouterProps } from '../context_menu_with_router_support/context_menu_item_nav_by_rotuer';
import { AnyArtifact } from './types';
import { useNormalizedArtifact } from './hooks/use_normalized_artifact';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { CardContainerPanel } from './components/card_container_panel';
import { CardSectionPanel } from './components/card_section_panel';

export interface ArtifactEntryCardProps extends CommonProps {
  item: AnyArtifact;
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
  ({
    item,
    policies,
    actions,
    'data-test-subj': dataTestSubj,
    ...commonProps
  }: ArtifactEntryCardProps) => {
    const artifact = useNormalizedArtifact(item);
    const getTestId = useTestIdGenerator(dataTestSubj);

    // create the policy links for each policy listed in the artifact record by grabbing the
    // navigation data from the `policies` prop (if any)
    const policyNavLinks = useMemo<EffectScopeProps['policies']>(() => {
      return artifact.effectScope.type === 'policy'
        ? artifact?.effectScope.policies.map((id) => {
            return policies && policies[id]
              ? policies[id]
              : // else, unable to build a nav link, so just show id
                {
                  children: id,
                };
          })
        : undefined;
    }, [artifact.effectScope, policies]);

    return (
      <CardContainerPanel {...commonProps} data-test-subj={dataTestSubj}>
        <CardSectionPanel>
          <CardHeader
            name={artifact.name}
            createdDate={artifact.created_at}
            updatedDate={artifact.updated_at}
            actions={actions}
            data-test-subj={getTestId('header')}
          />
          <CardSubHeader
            createdBy={artifact.created_by}
            updatedBy={artifact.updated_by}
            policies={policyNavLinks}
            data-test-subj={getTestId('subHeader')}
          />

          <EuiSpacer size="m" />

          <EuiText>
            <p data-test-subj={getTestId('description')}>
              {artifact.description || getEmptyValue()}
            </p>
          </EuiText>
        </CardSectionPanel>

        <EuiHorizontalRule margin="xs" />

        <CardSectionPanel>
          <CriteriaConditions
            os={artifact.os as CriteriaConditionsProps['os']}
            entries={artifact.entries}
            data-test-subj={getTestId('criteriaConditions')}
          />
        </CardSectionPanel>
      </CardContainerPanel>
    );
  }
);

ArtifactEntryCard.displayName = 'ArtifactEntryCard';
