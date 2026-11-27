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

  it('finds the node, not the SVG element of an edge that has the same id before it', () => {
    const edge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edge.setAttribute('data-id', 'shared');
    root.appendChild(edge);
    const node = addElement('shared');

    expect(findElementByDataId(root, 'shared')).toBe(node);
  });

  it('returns nothing when only an edge has the id', () => {
    const edge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edge.setAttribute('data-id', 'only-edge');
    root.appendChild(edge);

    expect(findElementByDataId(root, 'only-edge')).toBeUndefined();
  });

  it('returns nothing when no element has the id, or there is no root', () => {
    addElement('a');

    expect(findElementByDataId(root, 'missing')).toBeUndefined();
    expect(findElementByDataId(null, 'a')).toBeUndefined();
    expect(findElementByDataId(undefined, 'a')).toBeUndefined();
  });
});
