/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiSelect,
  EuiSuperSelect,
  EuiFormRow,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../../common/doc_links';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { ChatForm, ChatFormFields } from '../../types';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { getDefaultSourceFields } from '../../utils/create_query';
import { AnalyticsEvents } from '../../analytics/constants';

interface EditContextFlyoutProps {
  onClose: () => void;
}

export const EditContextFlyout: React.FC<EditContextFlyoutProps> = ({ onClose }) => {
  const usageTracker = useUsageTracker();
  const { getValues } = useFormContext<ChatForm>();
  const selectedIndices: string[] = getValues(ChatFormFields.indices);
  const { fields } = useIndicesFields(selectedIndices);
  const defaultFields = getDefaultSourceFields(fields);

  const {
    field: { onChange: onChangeSize, value: docSizeInitialValue },
  } = useController({
    name: ChatFormFields.docSize,
  });

  const [docSize, setDocSize] = useState(docSizeInitialValue);

  const {
    field: { onChange: onChangeSourceFields, value: sourceFields },
  } = useController({
    name: ChatFormFields.sourceFields,
    defaultValue: defaultFields,
  });

  const [tempSourceFields, setTempSourceFields] = useState(sourceFields);

  const updateSourceField = (index: string, field: string) => {
    setTempSourceFields({
      ...tempSourceFields,
      [index]: [field],
    });
    usageTracker?.click(AnalyticsEvents.editContextFieldToggled);
  };

  const saveSourceFields = () => {
    usageTracker?.click(AnalyticsEvents.editContextSaved);
    onChangeSourceFields(tempSourceFields);
    onChangeSize(docSize);
    onClose();
  };

  const handleDocSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    usageTracker?.click(AnalyticsEvents.editContextDocSizeChanged);
    setDocSize(Number(e.target.value));
  };

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.editContextFlyoutOpened);
  }, [usageTracker]);

  return (
    <EuiFlyout ownFocus onClose={onClose} size="s" data-test-subj="editContextFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.searchPlayground.editContext.flyout.title"
              defaultMessage="Edit context"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.editContext.flyout.description"
              defaultMessage="Context is the information you provide to the LLM, by selecting fields from your Elasticsearch documents. Optimize context for better results."
            />
            <EuiLink
              href={docLinks.context}
              target="_blank"
              data-test-subj="context-optimization-documentation-link"
            >
              <FormattedMessage
                id="xpack.searchPlayground.editContext.flyout.learnMoreLink"
                defaultMessage=" Learn more."
              />
            </EuiLink>
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem grow={3}>
            <EuiFlexGroup direction="column" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.searchPlayground.editContext.flyout.docsRetrievedCount',
                    {
                      defaultMessage: 'Number of documents sent to LLM',
                    }
                  )}
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
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="column" gutterSize="m">
                  <EuiFlexItem>
                    <EuiText>
                      <h5>
                        <FormattedMessage
                          id="xpack.searchPlayground.editContext.flyout.table.title"
                          defaultMessage="Select fields"
                        />
                      </h5>
                    </EuiText>
                  </EuiFlexItem>
                  {Object.entries(fields).map(([index, group]) => (
                    <EuiFlexItem grow={false} key={index}>
                      <EuiFormRow label={index}>
                        <EuiSuperSelect
                          data-test-subj={`contextFieldsSelectable_${index}`}
                          options={group.source_fields.map((field) => ({
                            value: field,
                            inputDisplay: field,
                            'data-test-subj': 'contextField',
                          }))}
                          valueOfSelected={tempSourceFields[index]?.[0]}
                          onChange={(value) => updateSourceField(index, value)}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.searchPlayground.editContext.flyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={saveSourceFields} fill>
              <FormattedMessage
                id="xpack.searchPlayground.editContext.flyout.saveButton"
                defaultMessage="Save changes"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
