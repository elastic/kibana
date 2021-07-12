/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StatefulFieldsBrowser } from './fields_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from './fields_browser/helpers';
import { FieldBrowserProps } from './fields_browser/types';

export const getFieldBrowser = (props: Omit<FieldBrowserProps, 'width' | 'height'>) => () => (
  <StatefulFieldsBrowser height={FIELD_BROWSER_HEIGHT} width={FIELD_BROWSER_WIDTH} {...props} />
);
