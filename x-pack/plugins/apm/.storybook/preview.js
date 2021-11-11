/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProviderDecorator } from '../../../../src/plugins/kibana_react/common';
import { MockContextDecorator } from '../public/context/mock/mock_context';

export const decorators = [EuiThemeProviderDecorator, MockContextDecorator];
