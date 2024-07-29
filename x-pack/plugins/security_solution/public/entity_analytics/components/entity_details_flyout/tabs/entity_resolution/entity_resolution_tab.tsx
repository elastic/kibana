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
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import type { EntityResolutionSuggestion } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/css';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { USER_PREVIEW_BANNER } from '../../../../../flyout/document_details/right/components/user_entity_overview';
import { UserPreviewPanelKey } from '../../../../../flyout/entity_details/user_right';
import { useEntityResolutions } from '../../../../api/hooks/use_entity_resolutions';

interface Props {
  username: string;
  scopeId: string;
}

export const EntityResolutionTab = ({ username, scopeId }: Props) => {
  const { resolutions, markResolved } = useEntityResolutions({ name: username, type: 'user' });

  const [updating, setUpdating] = React.useState<Record<string, boolean>>({});
  const toggleUpdating = (id: string) => setUpdating((prev) => ({ ...prev, [id]: !prev[id] }));

  const resolve = (id: string, name: string, relation: 'is_same' | 'is_different') => {
    toggleUpdating(id);
    markResolved({ id, type: 'user', name }, relation);
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
            openPreviewPanel={() => openPreview(candidate.entity?.name)}
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
            openPreviewPanel={() => openPreview(candidate.entity?.name)}
          />
        ))}
      </EuiPageSection>
    </>
  );
};

type ItemProps = EntityResolutionSuggestion & {
  resolve: (id: string, name: string, relation: 'is_same' | 'is_different') => void;
  updating: Record<string, boolean>;
  openPreviewPanel: (id: string) => void;
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
  openPreviewPanel,
  isCandidate,
}) => {
  if (!entity || !document || !id) return null;

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
      {isCandidate &&
        (updating[id] ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <>
            <EuiButtonEmpty size="m" onClick={() => resolve(id, entity.name, 'is_different')}>
              {'Mark as different'}
            </EuiButtonEmpty>
            <EuiButton
              size="m"
              iconType="check"
              onClick={() => resolve(id, entity.name, 'is_same')}
            >
              {'Confirm as Same'}
            </EuiButton>
          </>
        ))}
      <EuiButtonIcon onClick={() => openPreviewPanel(id)} iconType="expand" aria-label="Expand" />
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
