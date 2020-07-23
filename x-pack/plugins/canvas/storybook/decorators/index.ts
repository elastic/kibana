/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addDecorator } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs';
// @ts-expect-error
import { withInfo } from '@storybook/addon-info';

import { routerContextDecorator } from './router_decorator';
import { kibanaContextDecorator } from './kibana_decorator';

export const addDecorators = () => {
  addDecorator(withKnobs);
  addDecorator(kibanaContextDecorator);
  addDecorator(routerContextDecorator);
};
