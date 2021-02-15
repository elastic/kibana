/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pure } from 'recompose';
import { ItemGrid as Component, Props as ComponentProps } from './item_grid';

export const ItemGrid = pure<ComponentProps<any>>(Component);
