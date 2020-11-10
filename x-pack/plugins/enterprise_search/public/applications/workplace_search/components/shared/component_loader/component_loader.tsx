/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiLoadingSpinner, EuiTextColor } from '@elastic/eui';

import { IComponentLoader } from '../../../types';

import './component_loader.scss';

export const ComponentLoader: React.FC<IComponentLoader> = ({ text = 'Loading...' }) => (
  <div className="componentLoader">
    <EuiLoadingSpinner size="l" />
    <EuiTextColor className="componentLoaderText" color="subdued">
      {text}
    </EuiTextColor>
  </div>
);
