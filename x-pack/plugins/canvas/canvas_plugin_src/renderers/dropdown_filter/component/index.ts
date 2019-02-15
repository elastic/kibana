/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState } from 'recompose';
import { DropdownFilter as Component, Props as ComponentProps } from './dropdown_filter';

export interface Props {
  value?: string;
  commit: (value: string) => void;
  choices?: string[];
}

export const DropdownFilter = compose<ComponentProps, Props>(
  withState('value', 'onChange', ({ value }) => value || '')
)(Component);
