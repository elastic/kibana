/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 *
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import chrome from 'ui/chrome';

import { RendererFunction } from '../utils/typed_react';

interface WithKibanaChromeProps {
  children: RendererFunction<{
    basePath: string;
  }>;
}

export const WithKibanaChrome: React.SFC<WithKibanaChromeProps> = ({ children }) =>
  children({
    basePath: chrome.getBasePath(),
  });
