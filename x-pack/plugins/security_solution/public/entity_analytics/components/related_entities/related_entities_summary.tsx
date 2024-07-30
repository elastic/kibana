/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiButton, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { EntityResolutionSuggestion } from '@kbn/elastic-assistant-common';

import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import type { UseEntityResolution } from '../../api/hooks/use_entity_resolutions';

interface Props {
  resolution: UseEntityResolution;
  onOpen: (tab: EntityDetailsLeftPanelTab) => void;
}

export const RelatedEntitiesSummary: React.FC<Props> = ({ resolution, onOpen }) => {
  const header = {
    title: <EuiText>{'Related Entities'}</EuiText>,
    link: {
      callback: () => onOpen(EntityDetailsLeftPanelTab.OBSERVED_DATA),
      tooltip: 'View all related entities',
    },
  };

  return (
    <ExpandablePanel header={header}>
      <RelatedEntitiesSummaryContent resolution={resolution} onOpen={onOpen} />
    </ExpandablePanel>
  );
};

export const RelatedEntitiesSummaryContent: React.FC<Props> = ({ resolution, onOpen }) => {
  if (resolution.verifications.isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (resolution.verifications.data && resolution.verifications.data.length > 0) {
    return (
      <EuiBasicTable
        tableCaption="Verified as the same entity"
        items={resolution.verifications.data}
        rowHeader="firstName"
        columns={entityColumns}
      />
    );
  }

  if (resolution.scanning) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (!resolution.candidateData) {
    return (
      <EuiButton
        onClick={() => {
          resolution.setScanning(true);
          onOpen(EntityDetailsLeftPanelTab.OBSERVED_DATA);
        }}
      >
        {'Scan related entities'}
      </EuiButton>
    );
  }

  return (
    <EuiText>{`Found ${resolution.resolutions.candidates.length} potential related entities`}</EuiText>
  );
};

const entityColumns: Array<EuiBasicTableColumn<EntityResolutionSuggestion>> = [
  {
    field: 'related_entity.name',
    name: 'Entity',

    render: (name: string) => <EuiText>{name}</EuiText>,
  },
];
