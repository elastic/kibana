/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useController, useWatch } from 'react-hook-form';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { getDefaultSourceFields } from '../../utils/create_query';
import { ChatForm, ChatFormFields } from '../../types';
import { AnalyticsEvents } from '../../analytics/constants';

export const EditContextPanel: React.FC = () => {
  const usageTracker = useUsageTracker();
  const selectedIndices: string[] = useWatch<ChatForm, ChatFormFields.indices>({
    name: ChatFormFields.indices,
  });
  const { fields } = useIndicesFields(selectedIndices);
  const defaultFields = getDefaultSourceFields(fields);

  const {
    field: { onChange: onChangeSize, value: docSize },
  } = useController({
    name: ChatFormFields.docSize,
  });

  const {
    field: { onChange: onChangeSourceFields, value: sourceFields },
  } = useController<ChatForm, ChatFormFields.sourceFields>({
    name: ChatFormFields.sourceFields,
    defaultValue: defaultFields,
  });

  const updateSourceField = (index: string, field: string) => {
    onChangeSourceFields({
      ...sourceFields,
      [index]: [field],
    });
    usageTracker?.click(AnalyticsEvents.editContextFieldToggled);
  };

  const handleDocSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    usageTracker?.click(AnalyticsEvents.editContextDocSizeChanged);
    onChangeSize(Number(e.target.value));
  };

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.searchPlayground.editContext.docsRetrievedCount', {
              defaultMessage: 'Number of documents sent to LLM',
            })}
            fullWidth
          >
            <EuiSelect
              options={[
                {
                  value: 1,
                  text: '1',
                },
                {
                  value: 3,
                  text: '3',
                },
                {
                  value: 5,
                  text: '5',
                },
                {
                  value: 10,
                  text: '10',
                },
              ]}
              value={docSize}
              onChange={handleDocSizeChange}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.editContext.table.title"
                    defaultMessage="Context fields"
                  />
                </h5>
              </EuiText>
            </EuiFlexItem>
            {Object.entries(fields).map(([index, group]) => (
              <EuiFlexItem grow={false} key={index}>
                <EuiFormRow label={index} fullWidth>
                  <EuiSuperSelect
                    data-test-subj={`contextFieldsSelectable_${index}`}
                    options={group.source_fields.map((field) => ({
                      value: field,
                      inputDisplay: field,
                      'data-test-subj': 'contextField',
                    }))}
                    valueOfSelected={sourceFields[index]?.[0]}
                    onChange={(value) => updateSourceField(index, value)}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
