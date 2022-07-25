/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { prepareDescriptionList } from './resource_tab';

const mockData = {
  a: 'string',
  b: 123,
  c: undefined,
  d: null,
  e: true,
  f: false,
  g: [{ a: 'another string', b: 123 }],
};

describe('prepareDescriptionList', () => {
  it('create description lists accordingly', () => {
    const descriptionList = prepareDescriptionList(mockData);
    expect(descriptionList).toMatchSnapshot();
  });
});
