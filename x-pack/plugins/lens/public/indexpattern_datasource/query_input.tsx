/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { IndexPattern } from './types';
import { QueryStringInput, Query } from '../../../../../src/plugins/data/public';

export const QueryInput = ({
  value,
  onChange,
  indexPattern,
  isInvalid,
  onSubmit,
  disableAutoFocus,
}: {
  value: Query;
  onChange: (input: Query) => void;
  indexPattern: IndexPattern;
  isInvalid: boolean;
  onSubmit: () => void;
  disableAutoFocus?: boolean;
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
      disableAutoFocus={disableAutoFocus}
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
