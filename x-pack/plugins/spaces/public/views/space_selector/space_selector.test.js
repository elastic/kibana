/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SpaceSelector } from './space_selector';
import chrome from 'ui/chrome';
import renderer from 'react-test-renderer';
import { render, shallow } from 'enzyme';

function getHttpAgent(spaces = []) {
  const httpAgent = () => {};
  httpAgent.get = jest.fn(() => Promise.resolve({ data: spaces }));

  return httpAgent;
}


test('it renders without crashing', () => {
  const httpAgent = getHttpAgent();
  const component = renderer.create(
    <SpaceSelector spaces={[]} httpAgent={httpAgent} chrome={chrome}/>
  );
  expect(component).toMatchSnapshot();
});

test('it uses the spaces on props, when provided', () => {
  const httpAgent = getHttpAgent();

  const spaces = [{
    id: 'space-1',
    name: 'Space 1',
    description: 'This is the first space',
    urlContext: 'space-1-context'
  }];

  const component = render(
    <SpaceSelector spaces={spaces} httpAgent={httpAgent} chrome={chrome}/>
  );

  return Promise
    .resolve()
    .then(() => {
      expect(component.find('.spaceCard')).toHaveLength(1);
      expect(httpAgent.get).toHaveBeenCalledTimes(0);
    });
});

test('it queries for spaces when not provided on props', () => {
  const spaces = [{
    id: 'space-1',
    name: 'Space 1',
    description: 'This is the first space',
    urlContext: 'space-1-context'
  }];

  const httpAgent = getHttpAgent(spaces);

  const component = shallow(
    <SpaceSelector httpAgent={httpAgent} chrome={chrome}/>
  );

  return Promise
    .resolve()
    .then(() => {
      expect(httpAgent.get).toHaveBeenCalledTimes(1);
      expect(component.update().find('.spaceCard')).toHaveLength(1);
    });
});
