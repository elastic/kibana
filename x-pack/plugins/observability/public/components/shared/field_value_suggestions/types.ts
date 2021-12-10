/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PopoverAnchorPosition } from '@elastic/eui';
import { Dispatch, SetStateAction } from 'react';
import { ESFilter } from 'src/core/types/elasticsearch';
import { IInspectorInfo } from '../../../../../../../src/plugins/data/common';

interface CommonProps {
  selectedValue?: string[];
  excludedValue?: string[];
  label: string;
  button?: JSX.Element;
  width?: number;
  singleSelection?: boolean;
  forceOpen?: boolean;
  setForceOpen?: (val: boolean) => void;
  anchorPosition?: PopoverAnchorPosition;
  fullWidth?: boolean;
  compressed?: boolean;
  asFilterButton?: boolean;
  showCount?: boolean;
  usePrependLabel?: boolean;
  allowExclusions?: boolean;
  allowAllValuesSelection?: boolean;
  cardinalityField?: string;
  required?: boolean;
  keepHistory?: boolean;
}

export type FieldValueSuggestionsProps = CommonProps & {
  indexPatternTitle?: string;
  sourceField: string;
  asCombobox?: boolean;
  onChange: (val?: string[], excludedValue?: string[]) => void;
  filters: ESFilter[];
  time?: { from: string; to: string };
  inspector?: IInspectorInfo;
};

export type FieldValueSelectionProps = CommonProps & {
  loading?: boolean;
  onChange: (val?: string[], excludedValue?: string[]) => void;
  values?: ListItem[];
  query?: string;
  setQuery: Dispatch<SetStateAction<string>>;
};

export interface ListItem {
  label: string;
  count: number;
}
