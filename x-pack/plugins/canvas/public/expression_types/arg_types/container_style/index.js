/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withHandlers } from 'recompose';
import { set } from 'object-path-immutable';
import { get } from 'lodash';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate } from './extended_template';

const wrap = Component =>
  // TODO: this should be in a helper
  withHandlers({
    getArgValue: ({ argValue }) => (name, alt) => {
      const args = get(argValue, 'chain.0.arguments', {});
      return get(args, [name, 0], alt);
    },
    setArgValue: ({ argValue, onValueChange }) => (name, val) => {
      const newValue = set(argValue, ['chain', 0, 'arguments', name, 0], val);
      onValueChange(newValue);
    },
  })(Component);

export const containerStyle = () => ({
  name: 'containerStyle',
  displayName: 'Container style',
  help: 'Tweak the appearance of the element container',
  default: '{containerStyle}',
  simpleTemplate: templateFromReactComponent(wrap(SimpleTemplate)),
  template: templateFromReactComponent(wrap(ExtendedTemplate)),
});
