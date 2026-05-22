/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal Storybook annotations for Jest. Do not import `./preview` here:
 * the full preview eagerly loads `apmRouter` and the route tree (including
 * `ServiceMapGraph`), which prevents per-test `jest.mock()` from replacing
 * modules that graph.tsx already closed over.
 */
import { EuiThemeProviderDecorator } from '@kbn/kibana-react-plugin/common';
import * as jest from 'jest-mock';

(window as any).jest = jest;

export const decorators = [EuiThemeProviderDecorator];
