/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBasicTable,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { useSourceIndicesFields } from '../../hooks/use_source_indices_field';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { ChatForm, ChatFormFields } from '../../types';
import { AnalyticsEvents } from '../../analytics/constants';
import { docLinks } from '../../../common/doc_links';
import { createQuery } from '../../utils/create_query';

const isQueryFieldSelected = (
  queryFields: ChatForm[ChatFormFields.queryFields],
  index: string,
  field: string
): boolean => {
  return Boolean(queryFields[index]?.includes(field));
};

export const QueryMode: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const usageTracker = useUsageTracker();
  const { fields, isFieldsLoading } = useSourceIndicesFields();
  const sourceFields = useWatch<ChatForm, ChatFormFields.sourceFields>({
    name: ChatFormFields.sourceFields,
  });
  const {
    field: { onChange: queryFieldsOnChange, value: queryFields },
  } = useController<ChatForm, ChatFormFields.queryFields>({
    name: ChatFormFields.queryFields,
  });

  const {
    field: { onChange: elasticsearchQueryChange },
  } = useController({
    name: ChatFormFields.elasticsearchQuery,
  });

  const updateFields = (index: string, fieldName: string, checked: boolean) => {
    const currentIndexFields = checked
      ? [...queryFields[index], fieldName]
      : queryFields[index].filter((field) => fieldName !== field);
    const updatedQueryFields = { ...queryFields, [index]: currentIndexFields };

    queryFieldsOnChange(updatedQueryFields);
    elasticsearchQueryChange(createQuery(updatedQueryFields, sourceFields, fields));
    usageTracker?.count(AnalyticsEvents.queryFieldsUpdated, currentIndexFields.length);
  };

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.queryModeLoaded);
  }, [usageTracker]);

  const query = useMemo(
    () =>
      !isFieldsLoading && JSON.stringify(createQuery(queryFields, sourceFields, fields), null, 2),
    [isFieldsLoading, queryFields, sourceFields, fields]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem
        grow={6}
        className="eui-yScroll"
        css={{ padding: euiTheme.size.l, paddingRight: 0 }}
      >
        <EuiCodeBlock
          language="json"
          fontSize="m"
          paddingSize="none"
          lineNumbers
          transparentBackground
          data-test-subj="ViewElasticsearchQueryResult"
        >
          {query}
        </EuiCodeBlock>
      </EuiFlexItem>
      <EuiFlexItem
        grow={3}
        className="eui-yScroll"
        css={{ padding: euiTheme.size.l, paddingLeft: 0 }}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiText>
            <h5>
              <FormattedMessage
                id="xpack.searchPlayground.viewQuery.flyout.table.title"
                defaultMessage="Fields to search (per index)"
              />
            </h5>
          </EuiText>
          {Object.entries(fields).map(([index, group], indexNum) => (
            <EuiFlexItem grow={false} key={index}>
              <EuiPanel grow={false} hasShadow={false} hasBorder>
                <EuiAccordion
                  id={index}
                  buttonContent={
                    <EuiText>
                      <h5>{index}</h5>
                    </EuiText>
                  }
                  initialIsOpen
                  data-test-subj={`fieldsAccordion-${indexNum}`}
                >
                  <EuiSpacer size="s" />

                  <EuiBasicTable
                    tableCaption="Query Model table"
                    items={[
                      ...group.semantic_fields,
                      ...group.elser_query_fields,
                      ...group.dense_vector_query_fields,
                      ...group.bm25_query_fields,
                    ].map((field) => ({
                      name: typeof field === 'string' ? field : field.field,
                      checked: isQueryFieldSelected(
                        queryFields,
                        index,
                        typeof field === 'string' ? field : field.field
                      ),
                    }))}
                    rowHeader="name"
                    columns={[
                      {
                        field: 'name',
                        name: 'Field',
                        'data-test-subj': 'fieldName',
                      },
                      {
                        field: 'checked',
                        name: 'Enabled',
                        align: 'right',
                        render: (checked, field) => {
                          return (
                            <EuiSwitch
                              showLabel={false}
                              label={field.name}
                              checked={checked}
                              onChange={(e) => updateFields(index, field.name, e.target.checked)}
                              compressed
                            />
                          );
                        },
                      },
                    ]}
                  />

                  {group.skipped_fields > 0 && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiText
                            size="s"
                            color="subdued"
                            data-test-subj={`skippedFields-${indexNum}`}
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
  );
};
