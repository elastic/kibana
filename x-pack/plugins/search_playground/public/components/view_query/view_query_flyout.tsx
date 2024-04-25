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
import { AnalyticsEvents } from '../../analytics/constants';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { ChatForm, ChatFormFields, IndicesQuerySourceFields } from '../../types';
import { createQuery, getDefaultQueryFields, IndexFields } from '../../utils/create_query';

const groupFields = (
  fields: IndicesQuerySourceFields,
  queryFields: IndexFields
): { bm25: number; denseVector: number; sparse: number } =>
  Object.entries(queryFields).reduce(
    (results, [index, selectedFields]) => {
      const indexFields = fields[index];

      results.bm25 += selectedFields.filter((field) =>
        indexFields.bm25_query_fields.includes(field)
      ).length;
      results.denseVector += selectedFields.filter((field) =>
        indexFields.dense_vector_query_fields.find((vectorField) => vectorField.field === field)
      ).length;
      results.sparse += selectedFields.filter((field) =>
        indexFields.elser_query_fields.find((elserField) => elserField.field === field)
      ).length;

      return results;
    },
    { bm25: 0, denseVector: 0, sparse: 0 }
  );

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
    usageTracker.count(AnalyticsEvents.viewQueryFieldsUpdated, newFields.length);
  };

  const saveQuery = () => {
    queryFieldsOnChange(tempQueryFields);
    elasticsearchQueryChange(createQuery(tempQueryFields, fields));
    onClose();

    const groupedQueryFields = groupFields(fields, tempQueryFields);

    usageTracker.click(AnalyticsEvents.viewQuerySaved);
    usageTracker.count(AnalyticsEvents.viewQuerySparseFields, groupedQueryFields.sparse);
    usageTracker.count(AnalyticsEvents.viewQueryBm25Fields, groupedQueryFields.bm25);
    usageTracker.count(AnalyticsEvents.viewQueryDenseVectorFields, groupedQueryFields.denseVector);
  };

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.viewQueryFlyoutOpened);
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
