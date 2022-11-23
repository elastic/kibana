/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIconTip,
  EuiPopoverProps,
} from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import { QueryInput, useDebouncedValue, validateQuery } from '.';
import type { IndexPattern } from '../types';

const filterByLabel = i18n.translate('xpack.lens.indexPattern.filterBy.label', {
  defaultMessage: 'Filter by',
});

// to do: get the language from uiSettings
export const defaultFilter: Query = {
  query: '',
  language: 'kuery',
};

export function FilterQueryInput({
  inputFilter,
  onChange,
  indexPattern,
  helpMessage,
  label = filterByLabel,
  initiallyOpen,
  ['data-test-subj']: dataTestSubj,
}: {
  inputFilter: Query | undefined;
  onChange: (query: Query) => void;
  indexPattern: IndexPattern;
  helpMessage?: string | null;
  label?: string;
  initiallyOpen?: boolean;
  ['data-test-subj']?: string;
}) {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(Boolean(initiallyOpen));
  const { inputValue: queryInput, handleInputChange: setQueryInput } = useDebouncedValue<Query>({
    value: inputFilter ?? defaultFilter,
    onChange,
  });

  const onClosePopup: EuiPopoverProps['closePopover'] = useCallback(() => {
    setFilterPopoverOpen(false);
  }, []);

  const { isValid: isInputFilterValid } = validateQuery(inputFilter, indexPattern);
  const { isValid: isQueryInputValid, error: queryInputError } = validateQuery(
    queryInput,
    indexPattern
  );

  return (
    <EuiFormRow
      display="rowCompressed"
      label={
        helpMessage ? (
          <>
            {label}{' '}
            <EuiIconTip
              color="subdued"
              content={helpMessage}
              iconProps={{
                className: 'eui-alignTop',
              }}
              position="top"
              size="s"
              type="questionInCircle"
            />
          </>
        ) : (
          label
        )
      }
      fullWidth
      isInvalid={!isInputFilterValid}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiPopover
            isOpen={filterPopoverOpen}
            closePopover={onClosePopup}
            anchorClassName="eui-fullWidth"
            panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
            initialFocus={dataTestSubj ? `textarea[data-test-subj='${dataTestSubj}']` : undefined}
            button={
              <EuiPanel paddingSize="none" hasShadow={false} hasBorder>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>{/* Empty for spacing */}</EuiFlexItem>
                  <EuiFlexItem grow={true}>
                    <EuiLink
                      className="lnsFiltersOperation__popoverButton"
                      data-test-subj="indexPattern-filters-existingFilterTrigger"
                      onClick={() => {
                        setFilterPopoverOpen(!filterPopoverOpen);
                      }}
                      color={isInputFilterValid ? 'text' : 'danger'}
                      title={i18n.translate('xpack.lens.indexPattern.filterBy.clickToEdit', {
                        defaultMessage: 'Click to edit',
                      })}
                    >
                      {inputFilter?.query ||
                        i18n.translate('xpack.lens.indexPattern.filterBy.emptyFilterQuery', {
                          defaultMessage: '(empty)',
                        })}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            }
          >
            <EuiFormRow
              label={label}
              isInvalid={!isQueryInputValid}
              error={queryInputError}
              fullWidth={true}
              data-test-subj="indexPattern-filter-by-input"
            >
              <QueryInput
                indexPattern={
                  indexPattern.id
                    ? { type: 'id', value: indexPattern.id }
                    : { type: 'title', value: indexPattern.title }
                }
                disableAutoFocus={true}
                value={queryInput}
                onChange={setQueryInput}
                isInvalid={!isQueryInputValid}
                onSubmit={() => {}}
                data-test-subj={dataTestSubj}
              />
            </EuiFormRow>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
