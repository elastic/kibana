/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { CardHeader, CardHeaderProps } from './components/card_header';
import { CardSubHeader } from './components/card_sub_header';
import { CriteriaConditions, CriteriaConditionsProps } from './components/criteria_conditions';
import { AnyArtifact, MenuItemPropsByPolicyId } from './types';
import { useNormalizedArtifact } from './hooks/use_normalized_artifact';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { CardContainerPanel } from './components/card_container_panel';
import { CardSectionPanel } from './components/card_section_panel';
import { CardComments } from './components/card_comments';
import { usePolicyNavLinks } from './hooks/use_policy_nav_links';
import { MaybeImmutable } from '../../../../common/endpoint/types';
import { DescriptionField } from './components/description_field';

export interface CommonArtifactEntryCardProps extends CommonProps {
  item: MaybeImmutable<AnyArtifact>;
  /**
   * The list of actions for the card. Will display an icon with the actions in a menu if defined.
   */
  actions?: CardHeaderProps['actions'];

  /**
   * Information about the policies that are assigned to the `item`'s `effectScope` and that will be
   * used to create the items in the popup context menu. This is a
   * `Record<policyId: string, ContextMenuItemNavByRouterProps>`.
   */
  policies?: MenuItemPropsByPolicyId;
  loadingPoliciesList?: boolean;
}

export interface ArtifactEntryCardProps extends CommonArtifactEntryCardProps {
  // A flag to hide description section, false by default
  hideDescription?: boolean;
  // A flag to hide comments section, false by default
  hideComments?: boolean;
}

/**
 * Display Artifact Items (ex. Trusted App, Event Filter, etc) as a card.
 * This component is a TS Generic that allows you to set what the Item type is
 */
export const ArtifactEntryCard = memo<ArtifactEntryCardProps>(
  ({
    item,
    policies,
    loadingPoliciesList = false,
    actions,
    hideDescription = false,
    hideComments = false,
    'data-test-subj': dataTestSubj,
    ...commonProps
  }) => {
    const artifact = useNormalizedArtifact(item as AnyArtifact);
    const getTestId = useTestIdGenerator(dataTestSubj);
    const policyNavLinks = usePolicyNavLinks(artifact, policies);

    return (
      <CardContainerPanel {...commonProps} data-test-subj={dataTestSubj}>
        <CardSectionPanel className="top-section">
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
            loadingPoliciesList={loadingPoliciesList}
            data-test-subj={getTestId('subHeader')}
          />

          {!hideDescription && (
            <>
              <EuiSpacer size="l" />
              <DescriptionField data-test-subj={getTestId('description')}>
                {artifact.description}
              </DescriptionField>
            </>
          )}

          {!hideComments ? (
            <>
              {hideDescription && <EuiSpacer size="l" />}
              <CardComments comments={artifact.comments} data-test-subj={getTestId('comments')} />
            </>
          ) : null}
        </CardSectionPanel>

        <EuiHorizontalRule margin="none" />

        <CardSectionPanel className="bottom-section">
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
