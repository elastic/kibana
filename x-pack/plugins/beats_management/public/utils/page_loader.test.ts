/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteTreeBuilder } from './page_loader';

const pages = [
  './_404.tsx',
  './beat/detail.tsx',
  './beat/index.tsx',
  './beat/tags.tsx',
  './error/enforce_security.tsx',
  './error/invalid_license.tsx',
  './error/no_access.tsx',
  './overview/enrolled_beats.tsx',
  './overview/index.tsx',
  './overview/tag_configurations.tsx',
  './tag.tsx',
  './walkthrough/initial/beat.tsx',
  './walkthrough/initial/finish.tsx',
  './walkthrough/initial/index.tsx',
  './walkthrough/initial/tag.tsx',
];

describe('RouteTreeBuilder', () => {
  describe('routeTreeFromPaths', () => {
    it('Should fail to create a route tree due to no exported *Page component', () => {
      const mockRequire = jest.fn(path => ({
        path,
        testComponent: null,
      }));

      const treeBuilder = new RouteTreeBuilder(mockRequire);

      expect(() => {
        treeBuilder.routeTreeFromPaths(pages);
      }).toThrowError(/in the pages folder does not include an exported/);
    });

    it('Should create a route tree', () => {
      const mockRequire = jest.fn(path => ({
        path,
        testPage: null,
      }));

      const treeBuilder = new RouteTreeBuilder(mockRequire);

      let tree;
      expect(() => {
        tree = treeBuilder.routeTreeFromPaths(pages);
      }).not.toThrow();
      expect(tree).toMatchSnapshot();
    });

    it('Should fail to create a route tree due to no exported custom *Component component', () => {
      const mockRequire = jest.fn(path => ({
        path,
        testComponent: null,
      }));

      const treeBuilder = new RouteTreeBuilder(mockRequire, /Component$/);

      expect(() => {
        treeBuilder.routeTreeFromPaths(pages);
      }).not.toThrow();
    });

    it('Should create a route tree, with top level route having params', () => {
      const mockRequire = jest.fn(path => ({
        path,
        testPage: null,
      }));

      const treeBuilder = new RouteTreeBuilder(mockRequire);
      const tree = treeBuilder.routeTreeFromPaths(pages, {
        '/tag': ['action', 'tagid?'],
      });
      expect(tree).toMatchSnapshot();
    });

    it('Should create a route tree, with a nested route having params', () => {
      const mockRequire = jest.fn(path => ({
        path,
        testPage: null,
      }));

      const treeBuilder = new RouteTreeBuilder(mockRequire);
      const tree = treeBuilder.routeTreeFromPaths(pages, {
        '/beat': ['beatId'],
      });
      expect(tree[2].path).toEqual('/beat/:beatId');
    });
  });
  it('Should create a route tree, with a deep nested route having params', () => {
    const mockRequire = jest.fn(path => ({
      path,
      testPage: null,
    }));

    const treeBuilder = new RouteTreeBuilder(mockRequire);
    const tree = treeBuilder.routeTreeFromPaths(pages, {
      '/beat': ['beatId'],
      '/beat/detail': ['other'],
    });
    expect(tree[2].path).toEqual('/beat/:beatId');
    expect(tree[2].routes![0].path).toEqual('/beat/:beatId/detail/:other');
  });
});
