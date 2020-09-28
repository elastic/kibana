/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseActionFactoryContext } from '../../dynamic_actions';

/**
 * Interface used as piece of ActionFactoryContext that is passed in from drilldown wizard component to action factories
 * Omitted values are added inside the wizard and then full {@link BaseActionFactoryContext} passed into action factory methods
 */
export type ActionFactoryPlaceContext<
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> = Omit<ActionFactoryContext, 'triggers'>;
