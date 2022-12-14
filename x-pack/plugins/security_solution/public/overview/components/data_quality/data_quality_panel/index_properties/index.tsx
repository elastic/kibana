/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { sortBy } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import { useMappings } from '../../use_mappings';

import { ErrorEmptyPrompt } from '../error_empty_prompt';
import {
  getEnrichedFieldMetadata,
  getFieldTypes,
  getPartitionedFieldMetadata,
} from '../../helpers';
import { getTabs, SUMMARY_TAB_ID } from './helpers';
import { LoadingEmptyPrompt } from '../loading_empty_prompt';
import * as i18n from './translations';
import type { EcsMetadata, PartitionedFieldMetadata } from '../../types';
import { useAddToNewCase } from '../../use_add_to_new_case';

interface Props {
  docsCount: number;
  ecsMetadata: Record<string, EcsMetadata> | null;
  indexName: string;
  version: string;
}

const EMPTY_METADATA: PartitionedFieldMetadata = {
  all: [],
  ecsCompliant: [],
  nonEcs: [],
  notEcsCompliant: [],
};

const IndexPropertiesComponent: React.FC<Props> = ({
  docsCount,
  ecsMetadata,
  indexName,
  version,
}) => {
  const { error, indexes, loading } = useMappings(indexName);
  const mappingsProperties = useMemo(() => {
    if (indexes != null) {
      return indexes[indexName].mappings.properties;
    } else {
      return null;
    }
  }, [indexName, indexes]);

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
        docsCount,
        indexName,
        onAddToNewCase,
        partitionedFieldMetadata,
        setSelectedTabId,
        version,
      }),
    [addToNewCaseDisabled, docsCount, indexName, onAddToNewCase, partitionedFieldMetadata, version]
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

  const renderTabs = useCallback(
    () =>
      tabs.map((tab, index) => (
        <EuiTab
          append={tab.append}
          isSelected={tab.id === selectedTabId}
          key={index}
          onClick={() => onSelectedTabChanged(tab.id)}
        >
          {tab.name}
        </EuiTab>
      )),
    [onSelectedTabChanged, selectedTabId, tabs]
  );

  if (error != null) {
    return (
      <ErrorEmptyPrompt
        error={i18n.ERROR_LOADING_MAPPINGS_BODY(error)}
        title={i18n.ERROR_LOADING_MAPPINGS_TITLE}
      />
    );
  }

  if (loading) {
    return <LoadingEmptyPrompt loading={i18n.LOADING_MAPPINGS} />;
  }

  return indexes != null ? (
    <>
      <EuiTabs>{renderTabs()}</EuiTabs>
      {selectedTabContent}
    </>
  ) : null;
};

IndexPropertiesComponent.displayName = 'IndexPropertiesComponent';

export const IndexProperties = React.memo(IndexPropertiesComponent);
