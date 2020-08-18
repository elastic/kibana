/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line no-restricted-imports
import { shallowEqual, useSelector } from 'react-redux';

export const useShallowEqualSelector = (selector) => useSelector(selector, shallowEqual);
