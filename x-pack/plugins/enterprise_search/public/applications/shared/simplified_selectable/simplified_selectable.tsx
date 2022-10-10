/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSelectable } from '@elastic/eui';
import { EuiSelectableLIOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';

export interface Props {
  emptyMessage?: string;
  options: string[];
  selectedOptions: string[];
  onChange(selectedOptions: string[]): void;
}

export interface OptionMap {
  [key: string]: boolean;
}

export const SimplifiedSelectable: React.FC<Props> = ({
  emptyMessage,
  options,
  selectedOptions,
  onChange,
}) => {
  const selectedOptionsMap: OptionMap = selectedOptions.reduce(
    (acc, selectedOption) => ({
      ...acc,
      [selectedOption]: true,
    }),
    {}
  );

  const selectableOptions: Array<EuiSelectableLIOption<object>> = options.map((option) => ({
    label: option,
    checked: selectedOptionsMap[option] ? 'on' : undefined,
  }));

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="SelectAllButton"
            iconType="check"
            onClick={() => onChange(options)}
            disabled={selectedOptions.length === options.length}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.simplifiedSelectable.selectAllButtonLabel',
              {
                defaultMessage: 'Select all',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="DeselectAllButton"
            iconType="cross"
            onClick={() => onChange([])}
            disabled={selectedOptions.length === 0}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.simplifiedSelectable.deselectAllButtonLabel',
              {
                defaultMessage: 'Deselect all',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSelectable
        searchable
        options={selectableOptions}
        listProps={{ bordered: true }}
        onChange={(newSelectableOptions) => {
          onChange(
            newSelectableOptions.filter((option) => option.checked).map((option) => option.label)
          );
        }}
        emptyMessage={emptyMessage}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </>
  );
};
