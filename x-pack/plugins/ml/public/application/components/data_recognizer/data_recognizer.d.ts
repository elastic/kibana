/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import type { IIndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/types';
import type { SavedSearchSavedObject } from '../../../../common/types/kibana';

declare const DataRecognizer: FC<{
  indexPattern: IIndexPattern;
  savedSearch: SavedSearchSavedObject | null;
  results: {
    count: number;
    onChange?: Function;
  };
  className?: string;
}>;
