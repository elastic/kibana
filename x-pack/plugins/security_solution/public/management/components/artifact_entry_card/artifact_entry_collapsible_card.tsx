/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { CommonArtifactEntryCardProps } from './artifact_entry_card';
import { CardContainerPanel } from './components/card_container_panel';
import { useNormalizedArtifact } from './hooks/use_normalized_artifact';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';
import { CardSectionPanel } from './components/card_section_panel';
import { CriteriaConditions, CriteriaConditionsProps } from './components/criteria_conditions';
import { CardCompressedHeader } from './components/card_compressed_header';

export interface ArtifactEntryCollapsibleCardProps extends CommonArtifactEntryCardProps {
  onExpandCollapse: () => void;
  expanded?: boolean;
}

export const ArtifactEntryCollapsibleCard = memo<ArtifactEntryCollapsibleCardProps>(
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

    return (
      <CardContainerPanel {...commonProps} data-test-subj={dataTestSubj}>
        <CardSectionPanel className="artifact-entry-collapsible-card">
          <CardCompressedHeader
            artifact={artifact}
            actions={actions}
            policies={policies}
            expanded={expanded}
            onExpandCollapse={onExpandCollapse}
            data-test-subj={getTestId('header')}
          />
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
ArtifactEntryCollapsibleCard.displayName = 'ArtifactEntryCollapsibleCard';
