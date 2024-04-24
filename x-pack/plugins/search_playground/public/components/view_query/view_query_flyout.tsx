/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiSelectable,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiSelectableOption,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { ChatForm, ChatFormFields } from '../../types';
import {
  createQuery,
  getDefaultQueryFields,
  IndexFields,
  SUGGESTED_BM25_FIELDS,
  SUGGESTED_DENSE_VECTOR_FIELDS,
  SUGGESTED_SPARSE_FIELDS,
} from '../../utils/create_query';

interface ViewQueryFlyoutProps {
  onClose: () => void;
}

export const ViewQueryFlyout: React.FC<ViewQueryFlyoutProps> = ({ onClose }) => {
  const usageTracker = useUsageTracker();
  const { getValues } = useFormContext<ChatForm>();
  const selectedIndices: string[] = getValues(ChatFormFields.indices);
  const { fields } = useIndicesFields(selectedIndices);
  const defaultFields = getDefaultQueryFields(fields);

  const {
    field: { onChange: queryFieldsOnChange, value: queryFields },
  } = useController({
    name: ChatFormFields.queryFields,
    defaultValue: defaultFields,
  });

  const [tempQueryFields, setTempQueryFields] = useState<IndexFields>(queryFields);

  const {
    field: { onChange: elasticsearchQueryChange },
  } = useController({
    name: ChatFormFields.elasticsearchQuery,
  });

  const isQueryFieldSelected = (index: string, field: string) => {
    return tempQueryFields[index].includes(field);
  };

  const updateFields = (index: string, options: EuiSelectableOption[]) => {
    const newFields = options
      .filter((option) => option.checked === 'on')
      .map((option) => option.label);
    setTempQueryFields({
      ...tempQueryFields,
      [index]: newFields,
    });
    usageTracker.count('view_query_fields_updated', newFields.length);
  };

  const saveQuery = () => {
    queryFieldsOnChange(tempQueryFields);
    elasticsearchQueryChange(createQuery(tempQueryFields, fields));
    onClose();

    usageTracker.click('view_query_save');
    usageTracker.count(
      'view_query_sparse_fields',
      Object.values(tempQueryFields)
        .flat()
        .filter((field) => SUGGESTED_SPARSE_FIELDS.includes(field)).length
    );
    usageTracker.count(
      'view_query_bm25_fields',
      Object.values(tempQueryFields)
        .flat()
        .filter((field) => SUGGESTED_BM25_FIELDS.includes(field)).length
    );
    usageTracker.count(
      'view_query_dense_vector_fields',
      Object.values(tempQueryFields)
        .flat()
        .filter((field) => SUGGESTED_DENSE_VECTOR_FIELDS.includes(field)).length
    );
  };

  useEffect(() => {
    usageTracker.load('view_query_flyout_opened');
  }, [usageTracker]);

  return (
    <EuiFlyout ownFocus onClose={onClose} size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.searchPlayground.viewQuery.flyout.title"
              defaultMessage="Customise your Elasticsearch Query"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.viewQuery.flyout.description"
              defaultMessage="The query that will be used to search your data. You can customise it by choosing which
            fields to search on."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem grow={6}>
            <EuiCodeBlock
              language="json"
              fontSize="m"
              paddingSize="m"
              lineNumbers
              data-test-subj="ViewElasticsearchQueryResult"
            >
              {JSON.stringify(createQuery(tempQueryFields, fields), null, 2)}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiFlexGroup direction="column">
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.flyout.table.title"
                    defaultMessage="Selected Fields"
                  />
                </h5>
              </EuiText>
              {Object.entries(fields).map(([index, group], i) => (
                <EuiFlexItem grow={false} key={index}>
                  <EuiPanel grow={false} hasShadow={false} hasBorder>
                    <EuiAccordion
                      id={index}
                      initialIsOpen={i === 0}
                      buttonContent={
                        <EuiText>
                          <h5>{index}</h5>
                        </EuiText>
                      }
                    >
                      <EuiSpacer size="s" />
                      <EuiSelectable
                        aria-label="Select query fields"
                        options={[
                          ...group.elser_query_fields,
                          ...group.dense_vector_query_fields,
                          ...group.bm25_query_fields,
                        ].map((field) => ({
                          label: typeof field === 'string' ? field : field.field,
                          checked: isQueryFieldSelected(
                            index,
                            typeof field === 'string' ? field : field.field
                          )
                            ? 'on'
                            : undefined,
                        }))}
                        onChange={(newOptions) => updateFields(index, newOptions)}
                        listProps={{ bordered: false }}
                      >
                        {(list) => list}
                      </EuiSelectable>
                    </EuiAccordion>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.searchPlayground.viewQuery.flyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={saveQuery} fill>
              <FormattedMessage
                id="xpack.searchPlayground.viewQuery.flyout.saveButton"
                defaultMessage="Save changes"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
