/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { EntityResolutionSuggestion } from '@kbn/elastic-assistant-common';

import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import type { UseEntityResolution } from '../../api/hooks/use_entity_resolutions';

interface Props {
  resolutions: UseEntityResolution['resolutions'];
  onOpen: (tab: EntityDetailsLeftPanelTab) => void;
}

export const RelatedEntitiesSummary: React.FC<Props> = ({ resolutions, onOpen }) => {
  const header = {
    title: <EuiText>{'Related Entities'}</EuiText>,
    link: {
      callback: () => onOpen(EntityDetailsLeftPanelTab.OBSERVED_DATA),
      tooltip: 'View all related entities',
    },
  };

  return (
    <ExpandablePanel header={header}>
      <RelatedEntitiesSummaryContent resolutions={resolutions} onOpen={onOpen} />
    </ExpandablePanel>
  );
};

export const RelatedEntitiesSummaryContent: React.FC<Props> = ({ resolutions, onOpen }) => {
  if (resolutions.isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (!resolutions.data) {
    return <EuiText>{'No data found'}</EuiText>;
  }

  return (
    <>
      {resolutions.data && resolutions.data.candidates.length > 0 && (
        <EuiText>{`Found ${resolutions.data?.candidates.length} candidates`}</EuiText>
      )}
      {resolutions.data.marked.same.length > 0 && (
        <EuiBasicTable
          tableCaption="Verified as the same entity"
          items={resolutions.data.marked.same}
          rowHeader="firstName"
          columns={entityColumns}
        />
      )}
    </>
  );
};

const entityColumns: Array<EuiBasicTableColumn<EntityResolutionSuggestion>> = [
  {
    field: 'entity.name',
    name: 'Entity',

    render: (name: string) => <EuiText>{name}</EuiText>,
  },
  //   {
  //     field: 'document',
  //     name: 'Document',

  //     render: (document: {}) => <EuiCodeBlock>{JSON.stringify(document)}</EuiCodeBlock>,
  //   },
];
