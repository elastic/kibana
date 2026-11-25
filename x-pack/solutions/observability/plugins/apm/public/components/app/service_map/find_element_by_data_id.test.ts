/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findElementByDataId } from './find_element_by_data_id';

describe('findElementByDataId', () => {
  let root: HTMLDivElement;

  const addElement = (dataId: string) => {
    const element = document.createElement('div');
    element.setAttribute('data-id', dataId);
    root.appendChild(element);
    return element;
  };

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it('finds the element with the id', () => {
    addElement('a');
    const b = addElement('b');

    expect(findElementByDataId(root, 'b')).toBe(b);
  });

  it('finds an element whose id has characters that break a selector', () => {
    const element = addElement('service.namespace:"quoted"]');

    expect(findElementByDataId(root, 'service.namespace:"quoted"]')).toBe(element);
  });

  it('returns nothing when no element has the id, or there is no root', () => {
    addElement('a');

    expect(findElementByDataId(root, 'missing')).toBeUndefined();
    expect(findElementByDataId(null, 'a')).toBeUndefined();
    expect(findElementByDataId(undefined, 'a')).toBeUndefined();
  });
});
