/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getReduxDevtools = () => (window as any).__REDUX_DEVTOOLS_EXTENSION__;

export const hasReduxDevtools = () => getReduxDevtools() != null;

export const isDevMode = () => process.env.NODE_ENV !== 'production';
