/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import type { EntityResolutionSuggestion } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/css';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { noop } from 'lodash/fp';
import type { EntityRelationRecord } from '../../../../../../common/api/entity_analytics/entity_store/relations/common.gen';
import { USER_PREVIEW_BANNER } from '../../../../../flyout/document_details/right/components/user_entity_overview';
import { UserPreviewPanelKey } from '../../../../../flyout/entity_details/user_right';
import { useEntityResolutions } from '../../../../api/hooks/use_entity_resolutions';

interface Props {
  username: string;
  scopeId: string;
}

export const EntityResolutionTab = ({ username, scopeId }: Props) => {
  const ER = useEntityResolutions({ name: username, type: 'user' });

  const [updating, setUpdating] = React.useState<Record<string, boolean>>({});
  const toggleUpdating = (id: string) => setUpdating((prev) => ({ ...prev, [id]: !prev[id] }));

  const resolve = (id: string, name: string, relation: 'is_same' | 'is_different') => {
    toggleUpdating(id);
    ER.markResolved({ id, type: 'user', name }, relation);
  };

  const { openPreviewPanel } = useExpandableFlyoutApi();

  const openPreview = (userName: string) =>
    openPreviewPanel({
      id: UserPreviewPanelKey,
      params: {
        userName,
        scopeId,
        banner: USER_PREVIEW_BANNER,
      },
    });

  if (ER.verifications.isLoading) {
    return <EuiLoadingElastic size="xl" />;
  }

  const related = ER.resolutions.same.length > 0 && (
    <>
      <EuiText>{'Related Entities'}</EuiText>
      <EuiSpacer size="s" />

      {ER.resolutions.same.map((entity) => (
        <RelatedEntity
          {...entity}
          key={entity.id}
          openPreviewPanel={() => openPreview(entity?.name)}
        />
      ))}
    </>
  );
  return (
    <EuiPanel color="transparent" hasBorder={false}>
      <EuiTitle>
        <h2>{'Observed Data'}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />

      <CandidatesSection
        setScanning={ER.setScanning}
        state={
          ER.scanning
            ? 'scanning'
            : !ER.candidateData
            ? 'init'
            : ER.resolutions.candidates?.length === 0
            ? 'no_candidates'
            : 'data'
        }
      >
        {ER.resolutions.candidates?.map((candidate) => (
          <Candidate
            key={candidate.id}
            {...candidate}
            resolve={resolve}
            updating={updating}
            openPreviewPanel={() => openPreview(candidate.entity?.name)}
          />
        ))}
      </CandidatesSection>
      {related}
    </EuiPanel>
  );
};

interface CandidatesSectionProps {
  state: 'init' | 'scanning' | 'no_candidates' | 'data';
  setScanning: (value: boolean) => void;
}

const CandidatesSection: React.FC<CandidatesSectionProps> = ({ state, children, setScanning }) => {
  return (
    <>
      <EuiText>{'Candidate Entities'}</EuiText>
      <EuiSpacer size="s" />
      {state === 'scanning' ? (
        <EuiLoadingSpinner size="xl" />
      ) : state === 'init' ? (
        <EuiButton onClick={() => setScanning(true)}>{'Scan related entities'}</EuiButton>
      ) : state === 'no_candidates' ? (
        <EuiText>{'No candidates found'}</EuiText>
      ) : (
        children
      )}

      <EuiSpacer size="m" />
    </>
  );
};

type CandidateProps = EntityResolutionSuggestion & {
  resolve: (id: string, name: string, relation: 'is_same' | 'is_different') => void;
  updating: Record<string, boolean>;
  openPreviewPanel: (id: string) => void;
};

const Candidate: React.FC<CandidateProps> = ({
  entity,
  confidence,
  document,
  id = '',
  reason,
  resolve = noop,
  updating,
  openPreviewPanel = noop,
}) => {
  if (!entity) return null;

  const entityDataContent = (
    <EuiFlexGroup justifyContent="flexStart" alignItems="center">
      <EuiFlexItem
        css={css`
          max-width: 150px;
        `}
      >
        <EuiText size="m">{entity.name}</EuiText>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiText>{'Confidence:'}</EuiText>
          <EuiToolTip position="bottom" title="Reason" content={reason}>
            <EuiBadge color="default">{confidence}</EuiBadge>
          </EuiToolTip>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const entityActions = (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      {updating[id] ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <>
          <EuiButtonEmpty size="m" onClick={() => resolve(id, entity.name, 'is_different')}>
            {'Mark as different'}
          </EuiButtonEmpty>
          <EuiButton size="m" iconType="check" onClick={() => resolve(id, entity.name, 'is_same')}>
            {'Confirm as Same'}
          </EuiButton>
        </>
      )}
      <EuiButtonIcon onClick={() => openPreviewPanel(id)} iconType="expand" aria-label="Preview" />
    </EuiFlexGroup>
  );
  return (
    <>
      <EuiPanel hasBorder>
        <EuiAccordion id={id} buttonContent={entityDataContent} extraAction={entityActions}>
          <EuiSpacer size="m" />
          <EuiCodeBlock language="json">{JSON.stringify(document)}</EuiCodeBlock>
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="xs" />
    </>
  );
};

type RelatedEntityProps = EntityRelationRecord['related_entity'] & {
  openPreviewPanel: (id: string) => void;
};

const RelatedEntity: React.FC<RelatedEntityProps> = ({ id, name, openPreviewPanel = noop }) => {
  const entityDataContent = (
    <EuiFlexGroup justifyContent="flexStart" alignItems="center">
      <EuiFlexItem
        css={css`
          max-width: 150px;
        `}
      >
        <EuiText size="m">{name}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const entityActions = (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      <EuiButtonIcon onClick={() => openPreviewPanel(id)} iconType="expand" aria-label="Preview" />
    </EuiFlexGroup>
  );
  return (
    <>
      <EuiPanel hasBorder>
        <EuiAccordion id={id} buttonContent={entityDataContent} extraAction={entityActions}>
          <EuiSpacer size="m" />
          <EuiCodeBlock language="json">{JSON.stringify(document)}</EuiCodeBlock>
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="xs" />
    </>
  );
};
