/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
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
  EuiSpacer,
  EuiText,
  EuiPanel,
  EuiAccordion,
  EuiSelectable,
  EuiSelect,
  EuiSelectableOption,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChatForm, ChatFormFields } from '../../types';
import { useIndicesFields } from '../../hooks/use_indices_fields';
import { getDefaultSourceFields } from '../../utils/create_query';

interface EditContextFlyoutProps {
  onClose: () => void;
}

export const EditContextFlyout: React.FC<EditContextFlyoutProps> = ({ onClose }) => {
  const { watch } = useFormContext<ChatForm>();
  const selectedIndices: string[] = watch('indices');
  const { fields } = useIndicesFields(selectedIndices || []);
  const defaultFields = useMemo(() => getDefaultSourceFields(fields), [fields]);
  const [sourceFields, setSourceFields] = useState(defaultFields);

  const {
    field: { onChange: onChangeSize, value: docSizeInitialValue },
  } = useController({
    name: ChatFormFields.docSize,
  });

  const [docSize, setDocSize] = useState(docSizeInitialValue);

  const {
    field: { onChange: onChangeSourceFields },
  } = useController({
    name: ChatFormFields.sourceFields,
  });

  useEffect(() => {
    if (selectedIndices?.length > 0) {
      setSourceFields(defaultFields);
    }
  }, [selectedIndices, defaultFields]);

  const toggleSourceField = (index: string, f: EuiSelectableOption[]) => {
    setSourceFields({
      ...sourceFields,
      [index]: f.filter(({ checked }) => checked === 'on').map(({ label }) => label),
    });
  };

  const saveSourceFields = () => {
    onChangeSourceFields(sourceFields);
    onChangeSize(docSize);
    onClose();
  };

  return (
    <EuiFlyout ownFocus onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.searchPlayground.editContext.flyout.title"
              defaultMessage="Edit Context"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.editContext.flyout.description"
              defaultMessage="Documents retrieved and selected fields will be used to build the context."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem grow={3}>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <EuiSelect
                  prepend={i18n.translate(
                    'xpack.searchPlayground.editContext.flyout.docsRetrievedCount',
                    {
                      defaultMessage: 'Retrieved Documents',
                    }
                  )}
                  options={[
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
                  onChange={(e) => setDocSize(Number(e.target.value))}
                />
              </EuiFlexItem>
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.editContext.flyout.table.title"
                    defaultMessage="Selected Fields"
                  />
                </h5>
              </EuiText>
              {Object.entries(fields).map(([index, group], i) => (
                <EuiFlexItem grow={false} key={index}>
                  <EuiPanel grow={false} hasShadow={false} hasBorder>
                    <EuiAccordion
                      initialIsOpen={i === 0}
                      id={index}
                      buttonContent={
                        <EuiText>
                          <h5>{index}</h5>
                        </EuiText>
                      }
                    >
                      <EuiSpacer size="s" />
                      <EuiSelectable
                        aria-label="Select context fields"
                        options={group.source_fields.map((field) => ({
                          label: field,
                          checked: sourceFields[index]?.includes(field) ? 'on' : undefined,
                        }))}
                        onChange={(newOptions) => toggleSourceField(index, newOptions)}
                        listProps={{ bordered: false }}
                        singleSelection="always"
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
