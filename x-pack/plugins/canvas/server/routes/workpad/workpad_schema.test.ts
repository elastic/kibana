/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkpadSchema } from './workpad_schema';

const pageOneId = 'page-1';
const pageTwoId = 'page-2';
const elementOneId = 'element-1';
const elementTwoId = 'element-2';
const elementThreeId = 'element-3';

const position = {
  angle: 0,
  height: 0,
  left: 0,
  parent: null,
  top: 0,
  width: 0,
};
const baseWorkpad = {
  colors: [],
  css: '',
  variables: [],
  height: 0,
  id: 'workpad-id',
  name: 'workpad',
  page: 1,
  pages: [
    {
      elements: [
        {
          expression: 'expression',
          id: elementOneId,
          position,
        },
        {
          expression: 'expression',
          id: elementTwoId,
          position,
        },
      ],
      id: pageOneId,
      style: {},
    },
    {
      elements: [
        {
          expression: 'expression',
          id: elementThreeId,
          position,
        },
      ],
      id: pageTwoId,
      style: {},
    },
  ],
  width: 0,
};

it('validates there are no duplicate page ids', () => {
  const dupePage = {
    ...baseWorkpad,
    pages: [{ ...baseWorkpad.pages[0] }, { ...baseWorkpad.pages[1], id: pageOneId }],
  };

  expect(() => WorkpadSchema.validate(dupePage)).toThrowError('Page Ids are not unique');
});

it('validates there are no duplicate element ids on the same page', () => {
  const dupeElement = {
    ...baseWorkpad,
    pages: [
      {
        ...baseWorkpad.pages[0],
        elements: [
          { ...baseWorkpad.pages[0].elements[0] },
          { ...baseWorkpad.pages[0].elements[1], id: elementOneId },
        ],
      },
      { ...baseWorkpad.pages[1] },
    ],
  };

  expect(() => WorkpadSchema.validate(dupeElement)).toThrowError('Element Ids are not unique');
});

it('validates there are no duplicate element ids in the workpad', () => {
  const dupeElement = {
    ...baseWorkpad,
    pages: [
      {
        ...baseWorkpad.pages[0],
        elements: [
          { ...baseWorkpad.pages[0].elements[0] },
          { ...baseWorkpad.pages[0].elements[1], id: elementOneId },
        ],
      },
      {
        ...baseWorkpad.pages[1],
        elements: [{ ...baseWorkpad.pages[1].elements[0], id: elementOneId }],
      },
    ],
  };

  expect(() => WorkpadSchema.validate(dupeElement)).toThrowError('Element Ids are not unique');
});
