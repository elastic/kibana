/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pure, compose, withProps, withState } from 'recompose';
import { elementsRegistry } from '../../lib/elements_registry';

import { ElementTypes as Component } from './element_types';

const elementTypesState = withState('search', 'setSearch');
const elementTypeProps = withProps(() => ({ elements: elementsRegistry.toJS() }));

export const ElementTypes = compose(
  pure,
  elementTypesState,
  elementTypeProps
)(Component);
