/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState } from 'recompose';
import { RenderToDom as Component } from './render_to_dom';

export const RenderToDom = compose(
  withState('domNode', 'setDomNode') // Still don't like this, seems to be the only way todo it.
)(Component);
