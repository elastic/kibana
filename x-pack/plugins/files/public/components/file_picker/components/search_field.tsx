/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import { i18nTexts } from '../i18n_texts';

interface Props {
  onChange: (filterValue: string) => void;
}

export const SearchField: FunctionComponent<Props> = ({ onChange }) => {
  return (
    <EuiFieldSearch
      placeholder={i18nTexts.searchFieldPlaceholder}
      onChange={(ev) => onChange(ev.target.value)}
    />
  );
};
