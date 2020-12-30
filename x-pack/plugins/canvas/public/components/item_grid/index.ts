/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pure } from 'recompose';
import { ItemGrid as Component, Props as ComponentProps } from './item_grid';

export const ItemGrid = pure<ComponentProps<any>>(Component);
