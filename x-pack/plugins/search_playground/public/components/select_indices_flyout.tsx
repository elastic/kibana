/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSelectable,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { getIndicesWithNoSourceFields } from '../utils/create_query';
import { useIndicesFields } from '../hooks/use_indices_fields';
import { useSourceIndicesFields } from '../hooks/use_source_indices_field';
import { useQueryIndices } from '../hooks/use_query_indices';

interface SelectIndicesFlyout {
  onClose: () => void;
}

export const SelectIndicesFlyout: React.FC<SelectIndicesFlyout> = ({ onClose }) => {
  const [query, setQuery] = useState<string>('');
  const { indices, isLoading: isIndicesLoading } = useQueryIndices(query);
  const { indices: selectedIndices, setIndices: setSelectedIndices } = useSourceIndicesFields();
  const [selectedTempIndices, setSelectedTempIndices] = useState<string[]>(selectedIndices);
  const handleSelectOptions = (options: EuiSelectableOption[]) => {
    setSelectedTempIndices(
      options.filter((option) => option.checked === 'on').map((option) => option.label)
    );
  };
  const handleSearchChange = (searchValue: string) => {
    setQuery(searchValue);
  };

  const handleSaveQuery = () => {
    setSelectedIndices(selectedTempIndices);
    onClose();
  };
  const tabs = [
    {
      id: 'indices',
      name: i18n.translate('xpack.searchPlayground.setupPage.addDataSource.flyout.tabName', {
        defaultMessage: 'Indices',
      }),
      content: (
        <>
          <EuiSpacer />
          <EuiSelectable
            searchable
            searchProps={{
              onChange: handleSearchChange,
            }}
            options={[
              {
                label: i18n.translate(
                  'xpack.searchPlayground.setupPage.addDataSource.flyout.groupOption',
                  {
                    defaultMessage: 'Available indices',
                  }
                ),
                isGroupLabel: true,
              },
              ...indices.map(
                (index, num) =>
                  ({
                    label: index,
                    checked: selectedTempIndices.includes(index) ? 'on' : '',
                    'data-test-subj': `sourceIndex-${num}`,
                  } as EuiSelectableOption)
              ),
            ]}
            onChange={handleSelectOptions}
            listProps={{
              showIcons: true,
              bordered: false,
            }}
            isLoading={isIndicesLoading}
            renderOption={undefined}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </>
      ),
    },
  ];
  const { fields, isLoading: isFieldsLoading } = useIndicesFields(selectedTempIndices);
  const noSourceFieldsWarning = getIndicesWithNoSourceFields(fields);

  return (
    <EuiFlyout size="s" ownFocus onClose={onClose} data-test-subj="selectIndicesFlyout">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.searchPlayground.addDataSource.flyout.title"
              defaultMessage="Add data to query"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTabbedContent
          tabs={tabs}
          initialSelectedTab={tabs[0]}
          autoFocus="selected"
          data-test-subj="indicesTable"
        />
        {!isFieldsLoading && !!noSourceFieldsWarning && (
          <EuiCallOut color="warning" iconType="warning" data-test-subj="NoIndicesFieldsMessage">
            <p>
              <FormattedMessage
                id="xpack.searchPlayground.addDataSource.flyout.warningCallout"
                defaultMessage="No fields found for {errorMessage}. Try adding data to these indices."
                values={{ errorMessage: noSourceFieldsWarning }}
              />
            </p>
          </EuiCallOut>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              flush="left"
              data-test-subj="closeButton"
            >
              <FormattedMessage
                id="xpack.searchPlayground.addDataSource.flyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSaveQuery}
              data-test-subj="saveButton"
              fill
              disabled={!selectedTempIndices.length}
            >
              <FormattedMessage
                id="xpack.searchPlayground.setupPage.addDataSource.flyout.saveButton"
                defaultMessage="Save and continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
