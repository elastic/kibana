/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSourceIndicesFields } from '../../hooks/use_source_indices_field';
import { AddIndicesField } from './add_indices_field';
import { IndicesList } from './indices_list';

export const SourcesPanelSidebar: React.FC = () => {
  const { indices: selectedIndices, removeIndex, addIndex, loading } = useSourceIndicesFields();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate('xpack.searchPlayground.sources.callout', {
            defaultMessage: 'Changes update the query used to search your data',
          })}
          iconType="warning"
          size="s"
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <IndicesList indices={selectedIndices} onRemoveClick={removeIndex} hasBorder />
      </EuiFlexItem>

      <EuiFlexItem>
        <AddIndicesField
          selectedIndices={selectedIndices}
          onIndexSelect={addIndex}
          loading={loading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
