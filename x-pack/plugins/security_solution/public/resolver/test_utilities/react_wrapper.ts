/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactWrapper } from 'enzyme';

/**
 * Return a collection of attribute 'entries'.
 * The 'entries' are attributeName-attributeValue tuples.
 */
export function attributeEntries(wrapper: ReactWrapper): Array<[string, string]> {
  return Array.prototype.slice
    .call(wrapper.getDOMNode().attributes)
    .map(({ name, value }) => [name, value]);
}
