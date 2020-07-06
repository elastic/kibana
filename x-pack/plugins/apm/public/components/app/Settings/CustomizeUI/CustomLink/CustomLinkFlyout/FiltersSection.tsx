/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';
import {
  Filter,
  FilterKey,
} from '../../../../../../../common/custom_link/custom_link_types';
import {
  DEFAULT_OPTION,
  FILTER_SELECT_OPTIONS,
  getSelectOptions,
} from './helper';

export const FiltersSection = ({
  filters,
  onChangeFilters,
}: {
  filters: Filter[];
  onChangeFilters: (filters: Filter[]) => void;
}) => {
  const onChangeFilter = (
    key: Filter['key'],
    value: Filter['value'],
    idx: number
  ) => {
    const newFilters = [...filters];
    newFilters[idx] = { key, value };
    onChangeFilters(newFilters);
  };

  const onRemoveFilter = (idx: number) => {
    // remove without mutating original array
    const newFilters = [...filters];
    newFilters.splice(idx, 1);

    // if there is only one item left it should not be removed
    // but reset to empty
    if (isEmpty(newFilters)) {
      onChangeFilters([{ key: '', value: '' }]);
    } else {
      onChangeFilters(newFilters);
    }
  };

  const handleAddFilter = () => {
    onChangeFilters([...filters, { key: '', value: '' }]);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.flyout.filters.title',
            {
              defaultMessage: 'Filters',
            }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        {i18n.translate(
          'xpack.apm.settings.customizeUI.customLink.flyout.filters.subtitle',
          {
            defaultMessage:
              'Use the filter options to scope them to only appear for specific services.',
          }
        )}
      </EuiText>

      <EuiSpacer size="s" />

      {filters.map((filter, idx) => {
        const { key, value } = filter;
        const filterId = `filter-${idx}`;
        const selectOptions = getSelectOptions(filters, key);
        return (
          <EuiFlexGroup key={filterId} gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiSelect
                data-test-subj={filterId}
                id={filterId}
                fullWidth
                options={selectOptions}
                value={key}
                prepend={i18n.translate(
                  'xpack.apm.settings.customizeUI.customLink.flyout.filters.prepend',
                  {
                    defaultMessage: 'Field',
                  }
                )}
                onChange={(e) =>
                  onChangeFilter(e.target.value as FilterKey, value, idx)
                }
                isInvalid={
                  !isEmpty(value) &&
                  (isEmpty(key) || key === DEFAULT_OPTION.value)
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText
                data-test-subj={`${key}.value`}
                fullWidth
                placeholder={i18n.translate(
                  'xpack.apm.settings.customizeUI.customLink.flyOut.filters.defaultOption.value',
                  { defaultMessage: 'Value' }
                )}
                onChange={(e) => onChangeFilter(key, e.target.value, idx)}
                value={value}
                isInvalid={!isEmpty(key) && isEmpty(value)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="trash"
                onClick={() => onRemoveFilter(idx)}
                disabled={!value && !key && filters.length === 1}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}

      <EuiSpacer size="xs" />

      <AddFilterButton
        onClick={handleAddFilter}
        // Disable button when user has already added all items available
        isDisabled={filters.length === FILTER_SELECT_OPTIONS.length - 1}
      />
    </>
  );
};

const AddFilterButton = ({
  onClick,
  isDisabled,
}: {
  onClick: () => void;
  isDisabled: boolean;
}) => (
  <EuiButtonEmpty
    iconType="plusInCircle"
    onClick={onClick}
    disabled={isDisabled}
  >
    {i18n.translate(
      'xpack.apm.settings.customizeUI.customLink.flyout.filters.addAnotherFilter',
      {
        defaultMessage: 'Add another filter',
      }
    )}
  </EuiButtonEmpty>
);
