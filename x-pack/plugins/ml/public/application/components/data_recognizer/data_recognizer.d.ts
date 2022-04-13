/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FC } from 'react';
import { SavedSearchSavedObject } from '../../../../common/types/kibana';
import type { DataView } from '../../../../../../../src/plugins/data_views/public';

declare const DataRecognizer: FC<{
  indexPattern: DataView;
  savedSearch: SavedSearchSavedObject | null;
  results: {
    count: number;
    onChange?: Function;
  };
  className?: string;
}>;
