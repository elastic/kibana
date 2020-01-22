/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useDispatch } from 'react-redux';
import { ResolverAction } from '../types';

export const useResolverDispatch: () => (action: ResolverAction) => unknown = useDispatch;
