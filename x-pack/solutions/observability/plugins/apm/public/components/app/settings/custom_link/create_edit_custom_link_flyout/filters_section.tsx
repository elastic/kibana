/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Filter, FilterKey } from '../../../../../../common/custom_link/custom_link_types';
import { SuggestionsSelect } from '../../../../shared/suggestions_select';
import { DEFAULT_OPTION, FILTER_SELECT_OPTIONS, getSelectOptions } from './helper';

export function FiltersSection({
  filters,
  setFilters,
}: {
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
}) {
  const onChangeFilter = useCallback(
    (key: Filter['key'], value: Filter['value'], id: string) => {
      const newFilters = filters.map((item) => (item.id === id ? { id, key, value } : item));

      setFilters(newFilters);
    },
    [filters, setFilters]
  );

  const start = useMemo(() => moment().subtract(24, 'h').toISOString(), []);
  const end = useMemo(() => moment().toISOString(), []);

  const onRemoveFilter = (id: string) => {
    // remove without mutating original array
    const newFilters = filters.filter((item) => item.id !== id);

    // if there is only one item left it should not be removed
    // but reset to empty
    if (isEmpty(newFilters)) {
      setFilters([{ key: '', value: '', id }]);
    } else {
      setFilters(newFilters);
    }
  };

  const handleAddFilter = () => {
    setFilters([...filters, { id: uuidv4(), key: '', value: '' }]);
  };

  useEffect(() => {
    if (filters?.length && isEmpty(filters[0].key) && !filters[0]?.id) {
      const initialFiltersWithId = filters.map((item) => {
        return { ...item, id: uuidv4() };
      });

      setFilters(initialFiltersWithId);
    }

    return () => {};
  }, [filters, setFilters]);
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.settings.customLink.flyout.filters.title', {
            defaultMessage: 'Filters',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        {i18n.translate('xpack.apm.settings.customLink.flyout.filters.subtitle', {
          defaultMessage:
            'Use the filter options to scope them to only appear for specific services.',
        })}
      </EuiText>

      <EuiSpacer size="s" />

      {filters.map((filter) => {
        const { key, value } = filter;
        if (!filter.id) {
          filter.id = uuidv4();
        }
        const filterId = filter.id;
        const selectOptions = getSelectOptions(filters, key);
        const isEmptyFilter = isEmpty(key) || key === DEFAULT_OPTION.value;
        const filterRowTestSubj = isEmptyFilter
          ? 'apmCustomLinkFilterRowEmpty'
          : `apmCustomLinkFilterRow-${key}`;
        const filterSelectTestSubj = isEmptyFilter
          ? 'apmCustomLinkFilterSelectEmpty'
          : `apmCustomLinkFilterSelect-${key}-select`;
        return (
          <React.Fragment key={filterId}>
            <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj={filterRowTestSubj}>
              <EuiFlexItem>
                <EuiSelect
                  aria-label={i18n.translate(
                    'xpack.apm.settings.customLink.flyout.filters.ariaLabel',
                    {
                      defaultMessage: 'Choose a field to filter by',
                    }
                  )}
                  data-test-subj={filterSelectTestSubj}
                  id={filterId}
                  fullWidth
                  options={selectOptions}
                  value={key}
                  prepend={i18n.translate('xpack.apm.settings.customLink.flyout.filters.prepend', {
                    defaultMessage: 'Field',
                  })}
                  onChange={(e) =>
                    // set value to empty string to reset value when new field is selected
                    onChangeFilter(e.target.value as FilterKey, '', filterId)
                  }
                  isInvalid={!isEmpty(value) && (isEmpty(key) || key === DEFAULT_OPTION.value)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <SuggestionsSelect
                  key={filterId}
                  dataTestSubj={`${key}.value`}
                  fieldName={key}
                  placeholder={i18n.translate(
                    'xpack.apm.settings.customLink.flyOut.filters.defaultOption.value',
                    { defaultMessage: 'Value' }
                  )}
                  onChange={(selectedValue) =>
                    onChangeFilter(key, selectedValue as string, filterId)
                  }
                  defaultValue={value}
                  isInvalid={!isEmpty(key) && isEmpty(value)}
                  start={start}
                  end={end}
                  shouldReset={isEmpty(key) || key === DEFAULT_OPTION.value}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  aria-label={i18n.translate(
                    'xpack.apm.settings.customLink.flyout.filters.removeButton.ariaLabel',
                    {
                      defaultMessage: 'Remove filter',
                    }
                  )}
                  data-test-subj="apmCustomLinkFiltersSectionButton"
                  iconType="trash"
                  onClick={() => onRemoveFilter(filterId)}
                  disabled={!value && !key && filters.length === 1}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}

      <EuiSpacer size="xs" />

      <AddFilterButton
        onClick={handleAddFilter}
        // Disable button when user has already added all items available
        // or item is not properly setup (does not have key or value)
        isDisabled={
          filters.length === FILTER_SELECT_OPTIONS.length - 1 ||
          filters.some((filter) => isEmpty(filter.key) || isEmpty(filter.value))
        }
      />
    </>
  );
}

export function AddFilterButton({
  onClick,
  isDisabled,
}: {
  onClick: () => void;
  isDisabled: boolean;
}) {
  return (
    <EuiButtonEmpty
      aria-label={i18n.translate(
        'xpack.apm.settings.customLink.flyout.filters.addAnotherFilter.ariaLabel',
        {
          defaultMessage: 'Add another filter',
        }
      )}
      data-test-subj="apmCustomLinkAddFilterButtonAddAnotherFilterButton"
      iconType="plusInCircle"
      onClick={onClick}
      disabled={isDisabled}
    >
      {i18n.translate('xpack.apm.settings.customLink.flyout.filters.addAnotherFilter', {
        defaultMessage: 'Add another filter',
      })}
    </EuiButtonEmpty>
  );
}
