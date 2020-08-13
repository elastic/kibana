/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  generateTitle,
  enterpriseSearchTitle,
  appSearchTitle,
  workplaceSearchTitle,
} from './generate_title';

describe('generateTitle', () => {
  it('creates a hyphen separated string from an array of page titles', () => {
    const title = generateTitle(['Curations', 'some Engine', 'App Search']);
    expect(title).toEqual('Curations - some Engine - App Search');
  });
});

describe('enterpriseSearchTitle', () => {
  it('automatically appends the Enterprise Search product onto the pages array', () => {
    const title = enterpriseSearchTitle(['Setup Guide']);
    expect(title).toEqual('Setup Guide - Enterprise Search');
  });

  it('can be mixed and matched', () => {
    const title = enterpriseSearchTitle([appSearchTitle(['Some Page'])]);
    expect(title).toEqual('Some Page - App Search - Enterprise Search');
  });

  it('falls back to product name', () => {
    const title = enterpriseSearchTitle();
    expect(title).toEqual('Enterprise Search');
  });
});

describe('appSearchTitle', () => {
  it('automatically appends the App Search product onto the pages array', () => {
    const title = appSearchTitle(['Engines']);
    expect(title).toEqual('Engines - App Search');
  });

  it('falls back to product name', () => {
    const title = appSearchTitle();
    expect(title).toEqual('App Search');
  });
});

describe('workplaceSearchTitle', () => {
  it('automatically appends the Workplace Search product onto the pages array', () => {
    const title = workplaceSearchTitle(['Sources']);
    expect(title).toEqual('Sources - Workplace Search');
  });

  it('falls back to product name', () => {
    const title = workplaceSearchTitle();
    expect(title).toEqual('Workplace Search');
  });
});
