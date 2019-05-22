/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState } from 'recompose';
import { DropdownFilter as Component, Props as ComponentProps } from './dropdown_filter';

export interface Props {
  /**
   * A collection of choices to display in the dropdown
   * @default []
   */
  choices?: string[];
  /**
   * Optional value for the component. If the value is not present in the
   * choices collection, it will be discarded.
   */
  value?: string;
  /** Function to invoke when the dropdown value is committed */
  commit: (value: string) => void;
}

export const DropdownFilter = compose<ComponentProps, Props>(
  withState('value', 'onChange', ({ value }) => value || '')
)(Component);
