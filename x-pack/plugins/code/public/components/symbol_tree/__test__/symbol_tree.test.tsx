/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import renderer from 'react-test-renderer';
import { mockFunction } from '../../../utils/test_utils';
import { CodeSymbolTree } from '../code_symbol_tree';
import { props } from './__fixtures__/props';

test('render symbol tree correctly', () => {
  const tree = renderer
    .create(
      <MemoryRouter>
        <CodeSymbolTree
          structureTree={props.structureTree}
          closedPaths={[]}
          openSymbolPath={mockFunction}
          closeSymbolPath={mockFunction}
        />
      </MemoryRouter>
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
