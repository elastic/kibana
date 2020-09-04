/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, useState } from 'react';
import { EuiPopover, EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { FilterValue, defaultLabel } from '.';
import { IndexPattern } from '../../../types';

import {
  QueryStringInput,
  Query,
  esKuery,
  esQuery,
} from '../../../../../../../../src/plugins/data/public';

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
  const setPopoverOpen = (isOpen: boolean) => {
    setIsPopoverOpen(isOpen);
    setIsOpenByCreation(isOpen);
  };

  const [errorMessage, setErrorMessage] = useState('');

  const setFilterLabel = (label: string) => setFilter({ ...filter, label });
  const setFilterQuery = (input: Query) => {
    setErrorMessage('');
    try {
      if (input.language === 'kuery') {
        esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(input.query), indexPattern);
      } else {
        esQuery.luceneStringToDsl(input.query);
      }
      setFilter({ ...filter, input });
    } catch (e) {
      setErrorMessage(`Invalid syntax: ${JSON.stringify(e, null, 2)}`);
      console.log('Invalid syntax', JSON.stringify(e, null, 2)); // eslint-disable-line no-console
    }
  };

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
            isInvalid={!!errorMessage}
            value={filter.input}
            onChange={setFilterQuery}
            indexPattern={indexPattern}
          />
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <LabelInput
            value={filter.label || ''}
            onChange={setFilterLabel}
            placeholder={getPlaceholder(filter.input.query)}
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
}: {
  value: Query;
  onChange: (input: Query) => void;
  indexPattern: IndexPattern;
  isInvalid: boolean;
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
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
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
      prepend={i18n.translate('xpack.lens.indexPattern.filters.label', {
        defaultMessage: 'Label',
      })}
      aria-label={i18n.translate('xpack.lens.indexPattern.filters.label.aria-message', {
        defaultMessage: 'Label for your filter',
      })}
    />
  );
};
