/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty, PropertyName } from '@elastic/elasticsearch/lib/api/types';
import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { sortBy } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';

import {
  getEnrichedFieldMetadata,
  getFieldTypes,
  getPartitionedFieldMetadata,
} from '../../helpers';
import { getTabs, SUMMARY_TAB_ID } from './helpers';
import type { EcsMetadata, PartitionedFieldMetadata } from '../../types';
import { useAddToNewCase } from '../../use_add_to_new_case';

interface Props {
  ecsMetadata: Record<string, EcsMetadata> | null;
  indexName: string;
  mappingsProperties: Record<PropertyName, MappingProperty> | undefined;
  version: string;
}

const EMPTY_METADATA: PartitionedFieldMetadata = {
  all: [],
  ecsCompliant: [],
  nonEcs: [],
  notEcsCompliant: [],
};

const IndexPropertiesComponent: React.FC<Props> = ({
  ecsMetadata,
  indexName,
  mappingsProperties,
  version,
}) => {
  const partitionedFieldMetadata: PartitionedFieldMetadata = useMemo(() => {
    if (ecsMetadata == null || mappingsProperties == null) {
      return EMPTY_METADATA;
    }

    const fieldTypes = getFieldTypes(mappingsProperties);

    const enrichedFieldMetadata = sortBy(
      'indexFieldName',
      fieldTypes.map((fieldMetadata) => getEnrichedFieldMetadata({ ecsMetadata, fieldMetadata }))
    );

    return getPartitionedFieldMetadata(enrichedFieldMetadata);
  }, [ecsMetadata, mappingsProperties]);

  const { disabled: addToNewCaseDisabled, onAddToNewCase } = useAddToNewCase({ indexName });
  const [selectedTabId, setSelectedTabId] = useState<string>(SUMMARY_TAB_ID);
  const tabs = useMemo(
    () =>
      getTabs({
        addToNewCaseDisabled,
        indexName,
        onAddToNewCase,
        partitionedFieldMetadata,
        setSelectedTabId,
        version,
      }),
    [addToNewCaseDisabled, indexName, onAddToNewCase, partitionedFieldMetadata, version]
  );
  const onSelectedTabChanged = useCallback((id: string) => {
    setSelectedTabId(id);
  }, []);
  const selectedTabContent = useMemo(
    () => (
      <>
        <EuiSpacer />
        {tabs.find((obj) => obj.id === selectedTabId)?.content}
      </>
    ),
    [selectedTabId, tabs]
  );

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        append={tab.append}
        isSelected={tab.id === selectedTabId}
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <>
      <EuiTabs>{renderTabs()}</EuiTabs>
      {selectedTabContent}
    </>
  );
};

IndexPropertiesComponent.displayName = 'IndexPropertiesComponent';

export const IndexProperties = React.memo(IndexPropertiesComponent);
