/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBasicTable,
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
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { ChatForm, ChatFormFields } from '../../types';
import { createQuery, getDefaultQueryFields } from '../../utils/create_query';

interface ViewQueryFlyoutProps {
  onClose: () => void;
}

export const ViewQueryFlyout: React.FC<ViewQueryFlyoutProps> = ({ onClose }) => {
  const { watch } = useFormContext<ChatForm>();
  const selectedIndices: string[] = watch(ChatFormFields.indices);
  const { fields } = useIndicesFields(selectedIndices || []);
  const defaultFields = useMemo(() => getDefaultQueryFields(fields), [fields]);
  const [queryFields, setQueryFields] = useState(defaultFields);

  const {
    field: { onChange },
  } = useController({
    name: ChatFormFields.elasticsearchQuery,
    defaultValue: {},
  });

  useEffect(() => {
    if (selectedIndices?.length > 0) {
      setQueryFields(defaultFields);
    }
  }, [selectedIndices, defaultFields]);

  const isQueryFieldSelected = (index: string, field: string) => {
    return queryFields[index].includes(field);
  };

  const toggleQueryField = (index: string, field: string) => {
    if (isQueryFieldSelected(index, field)) {
      setQueryFields({
        ...queryFields,
        [index]: queryFields[index].filter((x: string) => x !== field),
      });
    } else {
      setQueryFields({
        ...queryFields,
        [index]: [...queryFields[index], field],
      });
    }
  };

  const saveQuery = () => {
    onChange(createQuery(queryFields, fields));

    onClose();
  };

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
            <EuiCodeBlock language="json" fontSize="m" paddingSize="m" lineNumbers>
              {JSON.stringify(createQuery(queryFields, fields), null, 2)}
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
                        items={[
                          ...group.elser_query_fields,
                          ...group.dense_vector_query_fields,
                          ...group.bm25_query_fields,
                        ].map((field) => ({
                          field: typeof field === 'string' ? field : field.field,
                        }))}
                        columns={[
                          {
                            field: 'field',
                            name: i18n.translate(
                              'xpack.searchPlayground.viewQuery.flyout.table.field',
                              { defaultMessage: 'Field' }
                            ),
                            truncateText: false,
                            render: (field: string) => field,
                          },
                          {
                            actions: [
                              {
                                name: 'toggle',
                                description: i18n.translate(
                                  'xpack.searchPlayground.viewQuery.flyout.table.toggle',
                                  { defaultMessage: 'Toggle field' }
                                ),
                                isPrimary: true,
                                render: ({ field }: { field: string }) => (
                                  <EuiSwitch
                                    showLabel={false}
                                    label="toggle"
                                    checked={isQueryFieldSelected(index, field)}
                                    onChange={(e) => toggleQueryField(index, field)}
                                    compressed
                                  />
                                ),
                              },
                            ],
                          },
                        ]}
                        hasActions
                      />
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
