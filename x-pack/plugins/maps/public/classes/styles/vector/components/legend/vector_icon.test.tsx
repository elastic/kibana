/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { VectorIcon } from './vector_icon';

test('Renders PolygonIcon', () => {
  const component = shallow(
    <VectorIcon
      fillColor="#ff0000"
      isPointsOnly={false}
      isLinesOnly={false}
      strokeColor="rgb(106,173,213)"
    />
  );

  expect(component).toMatchSnapshot();
});

test('Renders LineIcon', () => {
  const component = shallow(
    <VectorIcon isPointsOnly={false} isLinesOnly={true} strokeColor="rgb(106,173,213)" />
  );

  expect(component).toMatchSnapshot();
});

test('Renders CircleIcon', () => {
  const component = shallow(
    <VectorIcon
      fillColor="#ff0000"
      isPointsOnly={true}
      isLinesOnly={false}
      strokeColor="rgb(106,173,213)"
    />
  );

  expect(component).toMatchSnapshot();
});

test('Renders SymbolIcon', () => {
  const component = shallow(
    <VectorIcon
      fillColor="#ff0000"
      isPointsOnly={true}
      isLinesOnly={false}
      strokeColor="rgb(106,173,213)"
      symbolId="airfield-15"
    />
  );

  expect(component).toMatchSnapshot();
});
