/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createElement } from 'react';
import { pick } from 'lodash';
import { ArgForm } from '../components/arg_form';
import { argTypeRegistry } from './arg_type';

export class Arg {
  constructor(props) {
    const argType = argTypeRegistry.get(props.argType);
    if (!argType) {
      throw new Error(`Invalid arg type: ${props.argType}`);
    }
    if (!props.name) {
      throw new Error('Args must have a name property');
    }

    // properties that can be overridden
    const defaultProps = {
      multi: false,
      required: false,
      types: [],
      default: argType.default != null ? argType.default : null,
      options: {},
      resolve: () => ({}),
    };

    const viewOverrides = {
      argType,
      ...pick(props, [
        'name',
        'displayName',
        'help',
        'multi',
        'required',
        'types',
        'default',
        'resolve',
        'options',
      ]),
    };

    Object.assign(this, defaultProps, argType, viewOverrides);
  }

  // TODO: Document what these otherProps are. Maybe make them named arguments?
  render({ onValueChange, onValueRemove, argValue, key, label, ...otherProps }) {
    // This is everything the arg_type template needs to render
    const templateProps = {
      ...otherProps,
      ...this.resolve(otherProps),
      onValueChange,
      argValue,
      typeInstance: this,
    };

    const formProps = {
      key,
      argTypeInstance: this,
      valueMissing: this.required && argValue == null,
      label,
      onValueChange,
      onValueRemove,
      templateProps,
      argId: key,
    };

    return createElement(ArgForm, formProps);
  }
}
