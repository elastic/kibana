/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  CommonProps,
  EuiPanel,
  EuiText,
  EuiAccordion,
  EuiCheckableCard,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import styled from 'styled-components';
import { getEmptyValue } from '../../../common/components/empty_value';
import { CriteriaConditions, CriteriaConditionsProps } from './components/criteria_conditions';
import { AnyArtifact } from './types';
import { useNormalizedArtifact } from './hooks/use_normalized_artifact';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

const CardContainerPanel = styled(EuiCheckableCard)`
  &.artifactEntryCardMinified + &.artifactEntryCardMinified {
    margin-top: ${({ theme }) => theme.eui.spacerSizes.l};
  }
`;

export interface ArtifactEntryCardMinifiedProps extends CommonProps {
  item: AnyArtifact;
  isSelected: boolean;
  onToggleSelectedArtifact: (selected: boolean) => void;
}

/**
 * Display Artifact Items (ex. Trusted App, Event Filter, etc) as a minified card.
 * This component is a TS Generic that allows you to set what the Item type is
 */
export const ArtifactEntryCardMinified = memo(
  ({
    item,
    isSelected = false,
    onToggleSelectedArtifact,
    'data-test-subj': dataTestSubj,
    ...commonProps
  }: ArtifactEntryCardMinifiedProps) => {
    const artifact = useNormalizedArtifact(item);
    const getTestId = useTestIdGenerator(dataTestSubj);

    const [accordionTrigger, setAccordionTrigger] = useState<'open' | 'closed'>('closed');

    const handleOnToggleAccordion = useCallback(() => {
      setAccordionTrigger((current) => (current === 'closed' ? 'open' : 'closed'));
    }, []);

    const getAccordionTitle = useCallback(
      () => (accordionTrigger === 'open' ? 'Hide details' : 'Show details'),
      [accordionTrigger]
    );

    const getCardTitle = useCallback(
      () => (
        <>
          <EuiTitle size="xxs">
            <h5 data-test-subj={getTestId('title')}>{artifact.name}</h5>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </>
      ),
      [artifact.name, getTestId]
    );

    return (
      <CardContainerPanel
        {...commonProps}
        data-test-subj={dataTestSubj}
        className="artifactEntryCardMinified"
        id={artifact.name}
        label={getCardTitle()}
        checkableType="checkbox"
        value="checkbox1"
        checked={isSelected}
        onChange={() => onToggleSelectedArtifact(!isSelected)}
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
          <EuiTitle size="xxs">
            <h5 data-test-subj={getTestId('descriptionTitle')}>{'Description'}</h5>
          </EuiTitle>
          <EuiText>
            <p data-test-subj={getTestId('description')}>
              {artifact.description || getEmptyValue()}
            </p>
          </EuiText>
        </EuiPanel>

        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
          <EuiAccordion
            id="showDetails"
            buttonContent={getAccordionTitle()}
            arrowDisplay="right"
            forceState={accordionTrigger}
            onToggle={handleOnToggleAccordion}
          >
            <CriteriaConditions
              os={artifact.os as CriteriaConditionsProps['os']}
              entries={artifact.entries}
              data-test-subj={getTestId('criteriaConditions')}
            />
          </EuiAccordion>
        </EuiPanel>
      </CardContainerPanel>
    );
  }
);

ArtifactEntryCardMinified.displayName = 'ArtifactEntryCardMinified';
