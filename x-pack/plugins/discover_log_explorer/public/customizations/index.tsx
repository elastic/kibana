/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '../../common/dynamic';
import { CustomDataStreamSelectorBuilderProps } from './custom_data_stream_selector';

const LazyCustomDataStreamSelector = dynamic(() => import('./custom_data_stream_selector'));

export const createLazyCustomDataStreamSelector =
  (props: CustomDataStreamSelectorBuilderProps) => () =>
    <LazyCustomDataStreamSelector {...props} />;
