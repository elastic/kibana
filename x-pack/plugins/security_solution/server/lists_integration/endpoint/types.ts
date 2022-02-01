/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateExceptionListItemOptions } from '../../../../lists/server';

/**
 * An Exception Like item is a structure used internally by several of the Exceptions api/service in that
 * the keys are camelCased. Because different methods of the ExceptionListClient have slightly different
 * structures, this one attempt to normalize the properties we care about here that can be found across
 * those service methods.
 */
export type ExceptionItemLikeOptions = Pick<
  CreateExceptionListItemOptions,
  'osTypes' | 'tags' | 'description' | 'name' | 'entries' | 'namespaceType'
> & { listId?: string };
