/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
      icon={{
        value: 'airfield-15',
      }}
    />
  );

  expect(component).toMatchSnapshot();
});

test('Renders SymbolIcon with custom icon', () => {
  const component = shallow(
    <VectorIcon
      fillColor="#00ff00"
      isPointsOnly={true}
      isLinesOnly={false}
      strokeColor="rgb(0,255,0)"
      icon={{
        value: '__kbn__custom_icon_sdf__foobar',
        svg: '<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>',
      }}
    />
  );

  expect(component).toMatchSnapshot();
});
