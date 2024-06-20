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
  EuiCheckbox,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { AnalyticsEvents } from '../../analytics/constants';
import { docLinks } from '../../../common/doc_links';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { ChatForm, ChatFormFields, IndicesQuerySourceFields } from '../../types';
import { createQuery, getDefaultQueryFields, IndexFields } from '../../utils/create_query';

const groupTypeQueryFields = (
  fields: IndicesQuerySourceFields,
  queryFields: IndexFields
): string[] =>
  Object.entries(queryFields).map(([index, selectedFields]) => {
    const indexFields = fields[index];
    let typeQueryFields = '';

    if (selectedFields.some((field) => indexFields.bm25_query_fields.includes(field))) {
      typeQueryFields = 'BM25';
    }

    if (
      selectedFields.some((field) =>
        indexFields.dense_vector_query_fields.find((vectorField) => vectorField.field === field)
      )
    ) {
      typeQueryFields += (typeQueryFields ? '_' : '') + 'DENSE';
    }

    if (
      selectedFields.some((field) =>
        indexFields.elser_query_fields.find((elserField) => elserField.field === field)
      )
    ) {
      typeQueryFields += (typeQueryFields ? '_' : '') + 'SPARSE';
    }

    if (
      selectedFields.some((field) => indexFields.semantic_fields.find((f) => f.field === field))
    ) {
      typeQueryFields += (typeQueryFields ? '_' : '') + 'SEMANTIC';
    }

    return typeQueryFields;
  });

interface ViewQueryFlyoutProps {
  onClose: () => void;
}

export const ViewQueryFlyout: React.FC<ViewQueryFlyoutProps> = ({ onClose }) => {
  const usageTracker = useUsageTracker();
  const { getValues } = useFormContext<ChatForm>();
  const selectedIndices: string[] = getValues(ChatFormFields.indices);
  const sourceFields = getValues(ChatFormFields.sourceFields);
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
    usageTracker?.count(AnalyticsEvents.viewQueryFieldsUpdated, newFields.length);
  };

  const saveQuery = () => {
    queryFieldsOnChange(tempQueryFields);
    elasticsearchQueryChange(createQuery(tempQueryFields, sourceFields, fields));
    onClose();

    const groupedQueryFields = groupTypeQueryFields(fields, tempQueryFields);

    groupedQueryFields.forEach((typeQueryFields) =>
      usageTracker?.click(`${AnalyticsEvents.viewQuerySaved}_${typeQueryFields}`)
    );
  };

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.viewQueryFlyoutOpened);
  }, [usageTracker]);

  return (
    <EuiFlyout ownFocus onClose={onClose} size="l" data-test-subj="viewQueryFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.searchPlayground.viewQuery.flyout.title"
              defaultMessage="Customize your Elasticsearch query"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.viewQuery.flyout.description"
              defaultMessage="This query will be used to search your indices. Customize by choosing which
            fields in your Elasticsearch documents to search."
            />
            {` `}
            <EuiLink
              href={docLinks.retrievalOptimize}
              target="_blank"
              data-test-subj="query-optimize-documentation-link"
            >
              <FormattedMessage
                id="xpack.searchPlayground.viewQuery.flyout.learnMoreQueryOptimizeLink"
                defaultMessage="Learn more."
              />
            </EuiLink>
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
              {JSON.stringify(createQuery(tempQueryFields, sourceFields, fields), null, 2)}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.flyout.table.title"
                    defaultMessage="Fields to search (per index)"
                  />
                </h5>
              </EuiText>
              {Object.entries(fields).map(([index, group]) => (
                <EuiFlexItem grow={false} key={index}>
                  <EuiPanel grow={false} hasShadow={false} hasBorder>
                    <EuiAccordion
                      id={index}
                      initialIsOpen
                      buttonContent={
                        <EuiText>
                          <h5>{index}</h5>
                        </EuiText>
                      }
                    >
                      <EuiSpacer size="s" />
                      <EuiSelectable
                        aria-label="Select query fields"
                        data-test-subj={`queryFieldsSelectable_${index}`}
                        options={[
                          ...group.semantic_fields,
                          ...group.elser_query_fields,
                          ...group.dense_vector_query_fields,
                          ...group.bm25_query_fields,
                        ].map((field, idx) => {
                          const checked = isQueryFieldSelected(
                            index,
                            typeof field === 'string' ? field : field.field
                          );
                          return {
                            label: typeof field === 'string' ? field : field.field,
                            prepend: (
                              <EuiCheckbox
                                id={`checkbox_${idx}`}
                                checked={checked}
                                onChange={() => {}}
                              />
                            ),
                            checked: checked ? 'on' : undefined,
                            'data-test-subj': 'queryField',
                          };
                        })}
                        listProps={{
                          bordered: false,
                          showIcons: false,
                        }}
                        onChange={(newOptions) => updateFields(index, newOptions)}
                      >
                        {(list) => list}
                      </EuiSelectable>
                      {group.skipped_fields > 0 && (
                        <>
                          <EuiSpacer size="m" />
                          <EuiFlexGroup>
                            <EuiFlexItem>
                              <EuiText
                                size="s"
                                color="subdued"
                                data-test-subj={`skipped_fields_${index}`}
                              >
                                <EuiIcon type="eyeClosed" />
                                {` `}
                                <FormattedMessage
                                  id="xpack.searchPlayground.viewQuery.flyout.hiddenFields"
                                  defaultMessage="{skippedFields} fields are hidden."
                                  values={{ skippedFields: group.skipped_fields }}
                                />
                              </EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiLink
                                href={docLinks.hiddenFields}
                                target="_blank"
                                data-test-subj="hidden-fields-documentation-link"
                              >
                                <FormattedMessage
                                  id="xpack.searchPlayground.viewQuery.flyout.learnMoreLink"
                                  defaultMessage="Learn more."
                                />
                              </EuiLink>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </>
                      )}
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
