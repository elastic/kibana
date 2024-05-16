/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDispatchHook, createSelectorHook } from 'react-redux';
import { Context } from './context';

// These are internal to the this Dataview and should not be used outside. They won't work anyway since they are wired
// to the internal store.
export const useDispatch = createDispatchHook(Context);
export const useSelector = createSelectorHook(Context);
