/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { useSourceIndicesField } from '../../hooks/use_source_indices_field';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { createQuery, getDefaultQueryFields } from '../../utils/create_query';
import { ChatFormFields } from '../../types';
import { AddIndicesField } from './add_indices_field';
import { IndicesList } from './indices_list';

export const SourcesPanelSidebar: React.FC = () => {
  const { selectedIndices, removeIndex, addIndex } = useSourceIndicesField();
  const { fields } = useIndicesFields(selectedIndices || []);

  const {
    field: { onChange: elasticsearchQueryOnChange },
  } = useController({
    name: ChatFormFields.elasticsearchQuery,
    defaultValue: {},
  });

  useEffect(() => {
    if (fields) {
      const defaultFields = getDefaultQueryFields(fields);
      elasticsearchQueryOnChange(createQuery(defaultFields, fields));
    }
  }, [selectedIndices, fields, elasticsearchQueryOnChange]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate('xpack.searchPlayground.sources.callout', {
            defaultMessage: 'Changes here will reset your custom query',
          })}
          iconType="warning"
          size="s"
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <IndicesList indices={selectedIndices} onRemoveClick={removeIndex} hasBorder />
      </EuiFlexItem>

      <EuiFlexItem>
        <AddIndicesField selectedIndices={selectedIndices} onIndexSelect={addIndex} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
