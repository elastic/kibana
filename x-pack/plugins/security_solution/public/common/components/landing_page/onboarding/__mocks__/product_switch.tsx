/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const ProductSwitch = jest
  .fn()
  .mockImplementation(({ children }) => <div data-test-subj="product-switch">{children}</div>);
