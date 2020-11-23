/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './filter_popover.scss';

import React, { MouseEventHandler, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiPopover, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterValue, defaultLabel, isQueryValid } from '.';
import { IndexPattern } from '../../../types';
import { QueryStringInput, Query } from '../../../../../../../../src/plugins/data/public';
import { LabelInput } from '../shared_components';

export const FilterPopover = ({
  filter,
  setFilter,
  indexPattern,
  Button,
  isOpenByCreation,
  setIsOpenByCreation,
}: {
  filter: FilterValue;
  setFilter: Function;
  indexPattern: IndexPattern;
  Button: React.FunctionComponent<{ onClick: MouseEventHandler }>;
  isOpenByCreation: boolean;
  setIsOpenByCreation: Function;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>();

  const closePopover = () => {
    if (isOpenByCreation) {
      setIsOpenByCreation(false);
    }
    if (isPopoverOpen) {
      setIsPopoverOpen(false);
    }
  };

  const setFilterLabel = (label: string) => setFilter({ ...filter, label });
  const setFilterQuery = (input: Query) => setFilter({ ...filter, input });

  const getPlaceholder = (query: Query['query']) => {
    if (query === '') {
      return defaultLabel;
    }
    if (query === 'object') return JSON.stringify(query);
    else {
      return String(query);
    }
  };

  return (
    <EuiPopover
      data-test-subj="indexPattern-filters-existingFilterContainer"
      anchorClassName="eui-fullWidth"
      panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
      isOpen={isOpenByCreation || isPopoverOpen}
      ownFocus
      closePopover={() => closePopover()}
      button={
        <Button
          onClick={() => {
            if (isOpenByCreation) {
              setIsOpenByCreation(false);
            }
            setIsPopoverOpen((open) => !open);
          }}
        />
      }
    >
      <QueryInput
        isInvalid={!isQueryValid(filter.input, indexPattern)}
        value={filter.input}
        indexPattern={indexPattern}
        onChange={setFilterQuery}
        onSubmit={() => {
          if (inputRef.current) inputRef.current.focus();
        }}
      />
      <EuiSpacer size="s" />
      <LabelInput
        value={filter.label || ''}
        onChange={setFilterLabel}
        placeholder={getPlaceholder(filter.input.query)}
        inputRef={inputRef}
        onSubmit={() => closePopover()}
        dataTestSubj="indexPattern-filters-label"
      />
    </EuiPopover>
  );
};

export const QueryInput = ({
  value,
  onChange,
  indexPattern,
  isInvalid,
  onSubmit,
}: {
  value: Query;
  onChange: (input: Query) => void;
  indexPattern: IndexPattern;
  isInvalid: boolean;
  onSubmit: () => void;
}) => {
  const [inputValue, setInputValue] = useState(value);

  useDebounce(() => onChange(inputValue), 256, [inputValue]);

  const handleInputChange = (input: Query) => {
    setInputValue(input);
  };

  return (
    <QueryStringInput
      dataTestSubj="indexPattern-filters-queryStringInput"
      size="s"
      isInvalid={isInvalid}
      bubbleSubmitEvent={false}
      indexPatterns={[indexPattern]}
      query={inputValue}
      onChange={handleInputChange}
      onSubmit={() => {
        if (inputValue.query) {
          onSubmit();
        }
      }}
      placeholder={
        inputValue.language === 'kuery'
          ? i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderKql', {
              defaultMessage: '{example}',
              values: { example: 'method : "GET" or status : "404"' },
            })
          : i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderLucene', {
              defaultMessage: '{example}',
              values: { example: 'method:GET OR status:404' },
            })
      }
      languageSwitcherPopoverAnchorPosition="rightDown"
    />
  );
};
