/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AddIndicesField } from './add_indices_field';
import { IndicesTable } from './indices_table';
import { StartChatPanel } from '../start_chat_panel';
import { CreateIndexCallout } from './create_index_callout';
import { useQueryIndices } from '../../hooks/use_query_indices';
import { useSourceIndicesFields } from '../../hooks/use_source_indices_field';

export const SourcesPanelForStartChat: React.FC = () => {
  const {
    indices: selectedIndices,
    removeIndex,
    addIndex,
    loading: fieldIndicesLoading,
    noFieldsIndicesWarning,
  } = useSourceIndicesFields();
  const { indices, isLoading } = useQueryIndices();

  return (
    <StartChatPanel
      title={i18n.translate('xpack.searchPlayground.emptyPrompts.sources.title', {
        defaultMessage: 'Select indices',
      })}
      description={i18n.translate('xpack.searchPlayground.emptyPrompts.sources.description', {
        defaultMessage:
          "Select the Elasticsearch indices you'd like to query, providing additional context for the LLM.",
      })}
      isValid={!!selectedIndices?.length}
      dataTestSubj="selectIndicesChatPanel"
    >
      {!!selectedIndices?.length && (
        <EuiFlexItem>
          <IndicesTable indices={selectedIndices} onRemoveClick={removeIndex} />
        </EuiFlexItem>
      )}

      {noFieldsIndicesWarning && (
        <EuiCallOut color="warning" iconType="warning" data-test-subj="NoIndicesFieldsMessage">
          <p>
            {i18n.translate('xpack.searchPlayground.emptyPrompts.sources.warningCallout', {
              defaultMessage:
                'No fields found for {errorMessage}. Try adding data to these indices.',
              values: {
                errorMessage: noFieldsIndicesWarning,
              },
            })}
          </p>
        </EuiCallOut>
      )}

      {isLoading && (
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiLoadingSpinner size="l" data-test-subj="indicesLoading" />
        </EuiFlexGroup>
      )}

      {!isLoading && !!indices?.length && (
        <EuiFlexItem>
          <AddIndicesField
            selectedIndices={selectedIndices}
            onIndexSelect={addIndex}
            loading={fieldIndicesLoading}
          />
        </EuiFlexItem>
      )}

      {!isLoading && !indices?.length && <CreateIndexCallout />}
    </StartChatPanel>
  );
};
