/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PopoverAnchorPosition } from '@elastic/eui';
import { Dispatch, SetStateAction } from 'react';
import { ESFilter } from 'typings/elasticsearch';
import { IndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns';

interface CommonProps {
  selectedValue?: string[];
  label: string;
  button?: JSX.Element;
  width?: number;
  singleSelection?: boolean;
  forceOpen?: boolean;
  anchorPosition?: PopoverAnchorPosition;
  fullWidth?: boolean;
}

export type FieldValueSuggestionsProps = CommonProps & {
  indexPattern: IndexPattern;
  sourceField: string;
  asCombobox?: boolean;
  onChange: (val?: string[]) => void;
  filters: ESFilter[];
  time?: { from: string; to: string };
};

export type FieldValueSelectionProps = CommonProps & {
  loading?: boolean;
  onChange: (val?: string[]) => void;
  values?: string[];
  setQuery: Dispatch<SetStateAction<string>>;
};
