/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import React from 'react';
import { match } from 'react-router-dom';
import renderer from 'react-test-renderer';
import { MainRouteParams, PathTypes } from '../../common/types';
import { createHistory, createLocation, createMatch, mockFunction } from '../../utils/test_utils';
import props from './__fixtures__/props.json';
import { CodeFileTree } from './file_tree';

const location: Location = createLocation({
  pathname: '/github.com/google/guava/tree/master/guava/src/com/google',
});

const m: match<MainRouteParams> = createMatch({
  path: '/:resource/:org/:repo/:pathType(blob|tree)/:revision/:path*:goto(!.*)?',
  url: '/github.com/google/guava/tree/master/guava/src/com/google',
  isExact: true,
  params: {
    resource: 'github.com',
    org: 'google',
    repo: 'guava',
    pathType: PathTypes.tree,
    revision: 'master',
    path: 'guava/src/com/google',
  },
});

const history: History = createHistory({ location, length: 8, action: 'POP' });

test('render correctly', () => {
  const tree = renderer
    .create(
      <CodeFileTree
        node={props.node}
        openedPaths={props.openedPaths}
        history={history}
        match={m}
        location={location}
        closeTreePath={mockFunction}
        openTreePath={mockFunction}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
