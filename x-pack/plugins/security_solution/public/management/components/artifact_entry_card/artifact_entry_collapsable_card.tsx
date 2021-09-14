/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import classNames from 'classnames';
import { ArtifactEntryCardProps } from './artifact_entry_card';
import { CardContainerPanel } from './components/card_container_panel';
import { useNormalizedArtifact } from './hooks/use_normalized_artifact';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { usePolicyNavLinks } from './hooks/use_policy_nav_links';
import { CardSectionPanel } from './components/card_section_panel';
import { TextValueDisplay } from './components/text_value_display';
import { EffectScope } from './components/effect_scope';
import { CardExpandButton } from './components/card_expand_button';
import { CardActionsFlexItem } from './components/card_actions_flex_item';
import { CriteriaConditions, CriteriaConditionsProps } from './components/criteria_conditions';

export interface ArtifactEntryCollapsableCardProps extends ArtifactEntryCardProps {
  onExpandCollapse: () => void;
  expanded?: boolean;
}

export const ArtifactEntryCollapsableCard = memo<ArtifactEntryCollapsableCardProps>(
  ({
    item,
    onExpandCollapse,
    policies,
    actions,
    expanded = false,
    'data-test-subj': dataTestSubj,
    ...commonProps
  }) => {
    const artifact = useNormalizedArtifact(item);
    const getTestId = useTestIdGenerator(dataTestSubj);
    const policyNavLinks = usePolicyNavLinks(artifact, policies);

    const cssClassNames = useMemo(() => {
      return classNames({
        'eui-textTruncate': !expanded,
      });
    }, [expanded]);

    const handleExpandCollapseClick = useCallback(() => {
      onExpandCollapse();
    }, [onExpandCollapse]);

    return (
      <CardContainerPanel {...commonProps} data-test-subj={dataTestSubj}>
        <CardSectionPanel>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <CardExpandButton
                expanded={expanded}
                onClick={handleExpandCollapseClick}
                data-test-subj={getTestId('expandCollapse')}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2} className={cssClassNames} data-test-subj={getTestId('title')}>
              <TextValueDisplay bold truncate={!expanded}>
                {artifact.name}
              </TextValueDisplay>
            </EuiFlexItem>
            <EuiFlexItem
              grow={3}
              className={cssClassNames}
              data-test-subj={getTestId('description')}
            >
              <TextValueDisplay truncate={!expanded}>{artifact.description}</TextValueDisplay>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EffectScope policies={policyNavLinks} data-test-subj={getTestId('effectScope')} />
            </EuiFlexItem>
            <CardActionsFlexItem actions={actions} data-test-subj={getTestId('actions')} />
          </EuiFlexGroup>
        </CardSectionPanel>
        {expanded && (
          <>
            <EuiHorizontalRule margin="xs" />

            <CardSectionPanel>
              <CriteriaConditions
                os={artifact.os as CriteriaConditionsProps['os']}
                entries={artifact.entries}
                data-test-subj={getTestId('criteriaConditions')}
              />
            </CardSectionPanel>
          </>
        )}
      </CardContainerPanel>
    );
  }
);
ArtifactEntryCollapsableCard.displayName = 'ArtifactEntryCollapsableCard';
