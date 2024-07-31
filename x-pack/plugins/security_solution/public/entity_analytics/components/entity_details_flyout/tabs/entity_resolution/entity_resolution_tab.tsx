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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
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
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import { USER_PREVIEW_BANNER } from '../../../../../flyout/document_details/right/components/user_entity_overview';
import { UserPreviewPanelKey } from '../../../../../flyout/entity_details/user_right';
import { useEntityResolutions } from '../../../../api/hooks/use_entity_resolutions';
import OktaLogo from './icons/okta.svg';
import EntraIdLogo from './icons/entra_id.svg';

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

  const related = ER.verifications.data && ER.verifications.data.relatedEntitiesDocs.length > 0 && (
    <>
      <EuiText>{'Related Entities'}</EuiText>
      <EuiSpacer size="s" />

      {(ER.verifications.data?.relatedEntitiesDocs).map((doc) => (
        <RelatedEntity
          doc={doc}
          id={doc.entity.id}
          name={doc.user.name}
          key={doc.entity.id}
          openPreviewPanel={() => openPreview(doc?.user.name)}
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

const EntityLogo: React.FC<{ document: {} | undefined }> = ({ document }) => {
  if (document?.data_source === 'observed_data') {
    return <EuiIcon type="logoSecurity" size="l" />;
  }

  if (document?.data_source === 'entity_analytics_okta') {
    return <EuiIcon size="l" type={OktaLogo} />;
  }

  if (document?.data_source === 'entity_analytics_entra_id') {
    return <EuiIcon type={EntraIdLogo} size="l" />;
  }

  return <EuiIcon type="questionInCircle" size="l" />;
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
      <EntityLogo document={document} />
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
          <JsonCodeEditor json={document as unknown as Record<string, unknown>} height={300} />
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="xs" />
    </>
  );
};

interface RelatedEntityProps {
  doc: {};
  id: string;
  name: string;
  openPreviewPanel: (id: string) => void;
}

const RelatedEntity: React.FC<RelatedEntityProps> = ({
  id,
  name,
  openPreviewPanel = noop,
  doc,
}) => {
  const entityDataContent = (
    <EuiFlexGroup justifyContent="flexStart" alignItems="center">
      <EntityLogo document={document} />
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
          <JsonCodeEditor
            json={{ ...doc, id, name } as unknown as Record<string, unknown>}
            height={300}
          />
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="xs" />
    </>
  );
};
