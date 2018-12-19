/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, flatten, last } from 'lodash';

interface PathTree {
  [path: string]: string[];
}
export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  routes?: RouteConfig[];
}

interface RouteParamsMap {
  [path: string]: string[];
}

export class RouteTreeBuilder {
  constructor(
    private readonly requireWithContext: any,
    private readonly pageComponentPattern: RegExp = /Page$/
  ) {}

  public routeTreeFromPaths(paths: string[], mapParams: RouteParamsMap = {}): RouteConfig[] {
    const pathTree = this.buildTree('./', paths);
    const allRoutes = Object.keys(pathTree).reduce((routes: any[], filePath) => {
      if (pathTree[filePath].includes('index.tsx')) {
        routes.push(this.buildRouteWithChildren(filePath, pathTree[filePath], mapParams));
      } else {
        routes.concat(
          pathTree[filePath].map(file => routes.push(this.buildRoute(filePath, file, mapParams)))
        );
      }

      return routes;
    }, []);
    // Check that no overide maps are ignored due to being invalid
    const flatRoutes = this.flatpackRoutes(allRoutes);
    const mappedPaths = Object.keys(mapParams);
    const invalidOverrides = difference(mappedPaths, flatRoutes);
    if (invalidOverrides.length > 0 && flatRoutes.length > 0) {
      throw new Error(
        `Invalid overrideMap provided to 'routeTreeFromPaths', ${
          invalidOverrides[0]
        } is not a valid route. Only the following are: ${flatRoutes.join(', ')}`
      );
    }

    // 404 route MUST be last or it gets used first in a switch
    return allRoutes.sort((a: RouteConfig) => {
      return a.path === '*' ? 1 : 0;
    });
  }

  private flatpackRoutes(arr: RouteConfig[], pre: string = ''): string[] {
    return flatten(
      [].concat.apply(
        [],
        arr.map(item => {
          const path = (pre + item.path).trim();

          // The flattened route based on files without params added
          const route = item.path.includes('/:')
            ? item.path
                .split('/')
                .filter(s => s.charAt(0) !== ':')
                .join('/')
            : item.path;
          return item.routes ? [route, this.flatpackRoutes(item.routes, path)] : route;
        })
      )
    );
  }

  private buildRouteWithChildren(dir: string, files: string[], mapParams: RouteParamsMap) {
    const childFiles = files.filter(f => f !== 'index.tsx');
    const parentConfig = this.buildRoute(dir, 'index.tsx', mapParams);
    parentConfig.routes = childFiles.map(cf => this.buildRoute(dir, cf, mapParams));
    return parentConfig;
  }

  private buildRoute(dir: string, file: string, mapParams: RouteParamsMap): RouteConfig {
    // Remove the file extension as we dont want that in the URL... also index resolves to parent route
    // so remove that... e.g. /beats/index is not the url we want, /beats should resolve to /beats/index
    // just like how files resolve in node
    const filePath = `${mapParams[dir] || dir}${file.replace('.tsx', '')}`.replace('/index', '');
    const page = this.requireWithContext(`.${dir}${file}`);
    const cleanDir = dir.replace(/\/$/, '');

    // Make sure the expored variable name matches a pattern. By default it will choose the first
    // exported variable that matches *Page
    const componentExportName = Object.keys(page).find(varName =>
      this.pageComponentPattern.test(varName)
    );

    if (!componentExportName) {
      throw new Error(
        `${dir}${file} in the pages folder does not include an exported \`${this.pageComponentPattern.toString()}\` component`
      );
    }

    // _404 route is special and maps to a 404 page
    if (filePath === '/_404') {
      return {
        path: '*',
        component: page[componentExportName],
      };
    }

    // mapped route has a parent with mapped params, so we map it here too
    // e.g. /beat has a beatid param, so /beat/detail, a child of /beat
    // should also have that param resulting in /beat/:beatid/detail/:other
    if (mapParams[cleanDir] && filePath !== cleanDir) {
      const dirWithParams = `${cleanDir}/:${mapParams[cleanDir].join('/:')}`;
      const path = `${dirWithParams}/${file.replace('.tsx', '')}${
        mapParams[filePath] ? '/:' : ''
      }${(mapParams[filePath] || []).join('/:')}`;
      return {
        path,
        component: page[componentExportName],
      };
    }

    // route matches a mapped param exactly
    // e.g. /beat has a beatid param, so it becomes /beat/:beatid
    if (mapParams[filePath]) {
      return {
        path: `${filePath}/:${mapParams[filePath].join('/:')}`,
        component: page[componentExportName],
      };
    }

    return {
      path: filePath,
      component: page[componentExportName],
    };
  }

  // Build tree recursively
  private buildTree(basePath: string, paths: string[]): PathTree {
    return paths.reduce(
      (dir: any, p) => {
        const path = {
          dir:
            p
              .replace(basePath, '/') // make path absolute
              .split('/')
              .slice(0, -1) // remove file from path
              .join('/')
              .replace(/^\/\//, '') + '/', // should end in a slash but not be only //
          file: last(p.split('/')),
        };
        // take each, remove the file name

        if (dir[path.dir]) {
          dir[path.dir].push(path.file);
        } else {
          dir[path.dir] = [path.file];
        }
        return dir;
      },

      {}
    );
  }
}
