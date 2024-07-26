/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import type { EntityResolutionSuggestion } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/css';
import { useEntityResolutions } from '../../../../api/hooks/use_entity_resolutions';

interface Props {
  username: string;
}

export const EntityResolutionTab = ({ username }: Props) => {
  const { resolutions, markResolved } = useEntityResolutions({ name: username, type: 'user' });

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [updating, setUpdating] = React.useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleUpdating = (id: string) => setUpdating((prev) => ({ ...prev, [id]: !prev[id] }));

  const resolve = (id: string, name: string, relation: 'is_same' | 'is_different') => {
    toggleUpdating(id);
    markResolved({ id, type: 'user', name }, relation);
  };

  if (resolutions.isLoading) {
    return (
      <>
        <EuiPageHeader paddingSize="l" pageTitle="Observed Data" />
        <EuiPageSection color="subdued" />
        <EuiLoadingSpinner size="xl" />
      </>
    );
  }

  return (
    <>
      <EuiPageHeader paddingSize="l" pageTitle="Observed Data" />
      <EuiPageSection color="subdued">
        <EuiText>{'Candidate Entities'}</EuiText>
        {resolutions.data?.candidates?.map((candidate) => (
          <EntityItem
            key={candidate.id}
            {...candidate}
            resolve={resolve}
            updating={updating}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            isCandidate
          />
        ))}

        <EuiSpacer size="m" />
        <EuiText>{'Related Entities'}</EuiText>

        {resolutions.data?.marked.same.map((candidate) => (
          <EntityItem
            key={candidate.id}
            {...candidate}
            resolve={resolve}
            updating={updating}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
          />
        ))}
      </EuiPageSection>
    </>
  );
};

type ItemProps = EntityResolutionSuggestion & {
  resolve: (id: string, name: string, relation: 'is_same' | 'is_different') => void;
  updating: Record<string, boolean>;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  isCandidate?: boolean;
};

const EntityItem: React.FC<ItemProps> = ({
  entity,
  confidence,
  document,
  id,
  reason,
  resolve,
  updating,
  expanded,
  toggleExpanded,
  isCandidate,
}) => {
  if (!entity || !document || !id) return null;
  return (
    <>
      <EuiPanel hasBorder>
        <EuiFlexGroup justifyContent="spaceEvenly" direction="column">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexGroup justifyContent="flexStart" alignItems="center">
              <EuiFlexItem
                css={css`
                  max-width: 150px;
                `}
              >
                <EuiText size="m">{entity.name}</EuiText>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFlexGroup justifyContent="flexStart">
                  <EuiText>{'Confidence:'}</EuiText>
                  <EuiBadge color="default">{confidence}</EuiBadge>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              {isCandidate && (
                <>
                  <EuiButtonEmpty
                    size="m"
                    isLoading={updating[id]}
                    onClick={() => resolve(id, entity.name, 'is_different')}
                  >
                    {'Mark as different'}
                  </EuiButtonEmpty>
                  <EuiButton
                    size="m"
                    iconType="check"
                    isLoading={updating[id]}
                    onClick={() => resolve(id, entity.name, 'is_same')}
                  >
                    {'Confirm as Same'}
                  </EuiButton>
                </>
              )}
              <EuiButtonIcon
                onClick={() => toggleExpanded(id)}
                iconType="expand"
                aria-label="Expand"
              />
            </EuiFlexGroup>
          </EuiFlexGroup>
          {expanded[id] && <EuiCodeBlock language="json">{JSON.stringify(document)}</EuiCodeBlock>}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="xs" />
    </>
  );
};
