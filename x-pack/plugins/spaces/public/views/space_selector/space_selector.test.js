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
import { SpacesManager } from '../../lib/spaces_manager';


function getHttpAgent(spaces = []) {
  const httpAgent = () => {};
  httpAgent.get = jest.fn(() => Promise.resolve({ data: spaces }));

  return httpAgent;
}

function getSpacesManager(spaces = []) {
  const manager = new SpacesManager(getHttpAgent(spaces), chrome);

  const origGet = manager.getSpaces;
  manager.getSpaces = jest.fn(origGet);

  return manager;
}


test('it renders without crashing', () => {
  const spacesManager = getSpacesManager();
  const component = renderer.create(
    <SpaceSelector spaces={[]} spacesManager={spacesManager}/>
  );
  expect(component).toMatchSnapshot();
});

test('it uses the spaces on props, when provided', () => {
  const spacesManager = getSpacesManager();

  const spaces = [{
    id: 'space-1',
    name: 'Space 1',
    description: 'This is the first space',
    urlContext: 'space-1-context'
  }];

  const component = render(
    <SpaceSelector spaces={spaces} spacesManager={spacesManager} />
  );

  return Promise
    .resolve()
    .then(() => {
      expect(component.find('.spaceCard')).toHaveLength(1);
      expect(spacesManager.getSpaces).toHaveBeenCalledTimes(0);
    });
});

test('it queries for spaces when not provided on props', () => {
  const spaces = [{
    id: 'space-1',
    name: 'Space 1',
    description: 'This is the first space',
    urlContext: 'space-1-context'
  }];

  const spacesManager = getSpacesManager(spaces);

  shallow(
    <SpaceSelector spacesManager={spacesManager}/>
  );

  return Promise
    .resolve()
    .then(() => {
      expect(spacesManager.getSpaces).toHaveBeenCalledTimes(1);
    });
});
