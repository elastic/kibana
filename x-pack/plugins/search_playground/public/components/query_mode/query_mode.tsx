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
import React, { useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { ChatForm, ChatFormFields } from '../../types';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { AnalyticsEvents } from '../../analytics/constants';
import { docLinks } from '../../../common/doc_links';
import { createQuery, getDefaultQueryFields } from '../../utils/create_query';

export const QueryMode: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const usageTracker = useUsageTracker();
  const { getValues } = useFormContext<ChatForm>();
  const selectedIndices: string[] = getValues(ChatFormFields.indices);
  const { fields } = useIndicesFields(selectedIndices);
  const defaultFields = getDefaultQueryFields(fields);

  const {
    field: { onChange: queryFieldsOnChange, value: queryFields },
  } = useController<ChatForm, ChatFormFields.queryFields>({
    name: ChatFormFields.queryFields,
    defaultValue: defaultFields,
  });

  const {
    field: { onChange: elasticsearchQueryChange },
  } = useController({
    name: ChatFormFields.elasticsearchQuery,
  });

  const isQueryFieldSelected = (index: string, field: string) => {
    return queryFields[index].includes(field);
  };

  const updateFields = (index: string, fieldName: string, checked: boolean) => {
    const currentIndexFields = checked
      ? [...queryFields[index], fieldName]
      : queryFields[index].filter((field) => fieldName !== field);
    const updatedQueryFields = { ...queryFields, [index]: currentIndexFields };

    queryFieldsOnChange(updatedQueryFields);
    elasticsearchQueryChange(createQuery(updatedQueryFields, fields));
    usageTracker?.count(AnalyticsEvents.queryFieldsUpdated, currentIndexFields.length);
  };

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.queryModeLoaded);
  }, [usageTracker]);

  return (
    <EuiFlexGroup css={{ padding: euiTheme.size.l }}>
      <EuiFlexItem grow={6}>
        <EuiCodeBlock
          language="json"
          fontSize="m"
          paddingSize="m"
          lineNumbers
          transparentBackground
          data-test-subj="ViewElasticsearchQueryResult"
          className="eui-yScroll"
        >
          {JSON.stringify(createQuery(queryFields, fields), null, 2)}
        </EuiCodeBlock>
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiFlexGroup direction="column" className="eui-yScroll" gutterSize="s">
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
                  buttonContent={
                    <EuiText>
                      <h5>{index}</h5>
                    </EuiText>
                  }
                >
                  <EuiSpacer size="s" />

                  <EuiBasicTable
                    tableCaption="Query Model table"
                    data-test-subj={`queryFieldsSelectable_${index}`}
                    items={[
                      ...group.elser_query_fields,
                      ...group.dense_vector_query_fields,
                      ...group.bm25_query_fields,
                    ].map((field) => ({
                      name: typeof field === 'string' ? field : field.field,
                      checked: isQueryFieldSelected(
                        index,
                        typeof field === 'string' ? field : field.field
                      ),
                    }))}
                    rowHeader="firstName"
                    columns={[
                      {
                        field: 'name',
                        name: 'Field',
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
  );
};
