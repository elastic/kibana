/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, useState } from 'react';
import { EuiPopover, EuiFieldText, EuiForm, EuiFormRow, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { FilterValue, defaultLabel, isQueryValid } from '.';
import { IndexPattern } from '../../../types';
import { QueryStringInput, Query } from '../../../../../../../../src/plugins/data/public';

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

  const setPopoverOpen = (isOpen: boolean) => {
    setIsPopoverOpen(isOpen);
    setIsOpenByCreation(isOpen);
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
      anchorClassName="lnsLayerPanel__anchor"
      panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
      isOpen={isOpenByCreation || isPopoverOpen}
      ownFocus
      closePopover={() => {
        setPopoverOpen(false);
      }}
      button={
        <Button
          onClick={() => {
            setIsPopoverOpen((open) => !open);
            setIsOpenByCreation(false);
          }}
        />
      }
    >
      <EuiForm>
        <EuiFormRow fullWidth>
          <QueryInput
            isInvalid={!isQueryValid(filter.input, indexPattern)}
            value={filter.input}
            indexPattern={indexPattern}
            onChange={setFilterQuery}
            onSubmit={() => {
              if (inputRef.current) inputRef.current.focus();
            }}
          />
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <LabelInput
            value={filter.label || ''}
            onChange={setFilterLabel}
            placeholder={getPlaceholder(filter.input.query)}
            inputRef={inputRef}
            onSubmit={() => setPopoverOpen(false)}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPopover>
  );
};

const QueryInput = ({
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

  React.useEffect(() => {
    setInputValue(value);
  }, [value, setInputValue]);

  const onChangeDebounced = React.useMemo(() => debounce(onChange, 256), [onChange]);

  const handleInputChange = (input: Query) => {
    setInputValue(input);
    onChangeDebounced(input);
  };

  return (
    <QueryStringInput
      className={isInvalid ? 'lnsIndexPatternDimensionEditor__queryInput--invalid' : ''}
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
              defaultMessage: 'Example: {example}',
              values: { example: 'method : "GET" or status : "404"' },
            })
          : i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderLucene', {
              defaultMessage: 'Example: {example}',
              values: { example: 'method:GET OR status:404' },
            })
      }
      dataTestSubj="transformQueryInput"
      languageSwitcherPopoverAnchorPosition="rightDown"
    />
  );
};

const LabelInput = ({
  value,
  onChange,
  placeholder,
  inputRef,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputRef: React.MutableRefObject<HTMLInputElement | undefined>;
  onSubmit: () => void;
}) => {
  const [inputValue, setInputValue] = useState(value);

  React.useEffect(() => {
    setInputValue(value);
  }, [value, setInputValue]);

  const onChangeDebounced = React.useMemo(() => debounce(onChange, 256), [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = String(e.target.value);
    setInputValue(val);
    onChangeDebounced(val);
  };

  return (
    <EuiFieldText
      compressed
      data-test-subj="indexPattern-filters-label"
      value={inputValue}
      onChange={handleInputChange}
      fullWidth
      placeholder={placeholder}
      inputRef={(node) => {
        if (node) {
          inputRef.current = node;
        }
      }}
      onKeyDown={({ key }: React.KeyboardEvent<HTMLInputElement>) => {
        if (keys.ENTER === key) {
          onSubmit();
        }
      }}
      prepend={i18n.translate('xpack.lens.indexPattern.filters.label', {
        defaultMessage: 'Label',
      })}
      aria-label={i18n.translate('xpack.lens.indexPattern.filters.label.aria-message', {
        defaultMessage: 'Label for your filter',
      })}
    />
  );
};
