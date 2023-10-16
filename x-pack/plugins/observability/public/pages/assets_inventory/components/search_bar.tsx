/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import type { AssetFilters } from '@kbn/assetManager-plugin/common/types_api';
import { isAssetFilters } from '@kbn/assetManager-plugin/public';
import React, { ChangeEventHandler, KeyboardEventHandler, useCallback, useState } from 'react';

export interface SearchBarOptions {
  onChange?: (queryString: string) => void;
  onSubmit?: (parsed: AssetFilters) => void;
  onInvalidSearch?: (error: InvalidSearchError) => void;
}

export function SearchBar({ onChange, onSubmit, onInvalidSearch }: SearchBarOptions) {
  const [queryString, setQueryString] = useState<string>('');
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  const internalOnChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      console.log('setting queryString', e.target.value);
      setQueryString(e.target.value);
      if (onChange) onChange(e.target.value);
    },
    [setQueryString]
  );

  const internalOnKeyDown: KeyboardEventHandler = useCallback(
    (e) => {
      setIsInvalid(false);
      if (e.key === 'Enter') {
        try {
          console.log('About to parse query string', queryString);
          const parsed = parseQueryString(queryString);
          console.log('we parsed em!', parsed);
          if (onSubmit) onSubmit(parsed);
        } catch (error: any) {
          console.log('Error found while parsing query string', `${error}`);
          if (error instanceof InvalidSearchError) {
            console.log('annnnnd its an invalid search error too', error.queryString);
            if (onInvalidSearch) onInvalidSearch(error);
            setIsInvalid(true);
          }
        }
      }
    },
    [queryString, onSubmit, onInvalidSearch]
  );

  return (
    <EuiFieldSearch
      data-test-subj="AssetsSearchBarQuery"
      value={queryString}
      onChange={internalOnChange}
      onKeyDown={internalOnKeyDown}
      isInvalid={isInvalid}
      fullWidth
    />
  );
}

export class InvalidSearchError extends Error {
  public queryString: string;

  constructor(message: string, queryString: string) {
    super(message);
    this.name = 'InvalidSearchError';
    this.queryString = queryString;
  }
}

export function parseQueryString(queryString: string) {
  console.log('parsing query string', queryString);
  const noSpacesRegex = new RegExp(/([^\s]*)\s*:\s*([^\s]*)/g);
  const matches = [...queryString.matchAll(noSpacesRegex)];

  console.log('Inspect matches', matches);

  const filters = matches.reduce<any>((f, match) => {
    f[match[1]] = match[2];
    return f;
  }, {});

  // const eanMatch = matches.find((match) => match[1] === 'ean');
  // if (eanMatch) {
  //   filters.ean = eanMatch[2];
  // }

  // const typeMatch = matches.find((match) => match[1] === 'type');
  // if (typeMatch) {
  //   filters.type = typeMatch[2];
  // }

  console.log('Validating filter hash', filters);
  const validated = isAssetFilters(filters);
  console.log('Validation result:', validated);

  if (!validated) {
    throw new InvalidSearchError(`Query string is not currently valid`, queryString);
  }

  return filters;
}
