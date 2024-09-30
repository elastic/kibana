/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';

interface SourceFilterProps {
  selectedItems: EntitySource[];
  onChange: (selectedItems: EntitySource[]) => void;
}

export enum EntitySource {
  CSV_UPLOAD = 'CSV upload',
  EVENTS = 'Events',
}

export const EntitySourceFilter: React.FC<SourceFilterProps> = ({ selectedItems, onChange }) => {
  return (
    <MultiselectFilter<EntitySource>
      title={i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.entitySource.filterTitle',
        {
          defaultMessage: 'Source',
        }
      )}
      items={Object.values(EntitySource)}
      selectedItems={selectedItems}
      onSelectionChange={onChange}
      width={140}
    />
  );
};
