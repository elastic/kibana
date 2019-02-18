/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState } from 'recompose';

import { ColorManager as Component, Props as ComponentProps } from './color_manager';

export const ColorManager = compose<ComponentProps, ComponentProps>(
  withState('adding', 'setAdding', false)
)(Component);
