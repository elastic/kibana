/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path, { resolve } from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { flatten } from 'lodash';
import { pathsRegistry } from '@kbn/interpreter/common';

const canvasPluginDirectoryName = 'canvas_plugin';

const pathStructures = {
  serverFunctions: ['functions', 'server'],
  browserFunctions: ['functions', 'browser'],
  commonFunctions: ['functions', 'common'],
  types: ['types'],
  elements: ['elements'],
  renderers: ['renderers'],
  interfaces: ['interfaces'],
  transformUIs: ['uis', 'transforms'],
  datasourceUIs: ['uis', 'datasources'],
  modelUIs: ['uis', 'models'],
  viewUIs: ['uis', 'views'],
  argumentUIs: ['uis', 'arguments'],
};

export const pluginPaths = {
  serverFunctions: resolve(__dirname, 'canvas_plugin/functions/server'),
  browserFunctions: resolve(__dirname, 'canvas_plugin/functions/browser'),
  commonFunctions: resolve(__dirname, 'canvas_plugin/functions/common'),
  elements: resolve(__dirname, 'canvas_plugin/elements'),
  renderers: resolve(__dirname, 'canvas_plugin/renderers'),
  interfaces: resolve(__dirname, 'canvas_plugin/interfaces'),
  transformUIs: resolve(__dirname, 'canvas_plugin/uis/transforms'),
  datasourceUIs: resolve(__dirname, 'canvas_plugin/uis/datasources'),
  modelUIs: resolve(__dirname, 'canvas_plugin/uis/models'),
  viewUIs: resolve(__dirname, 'canvas_plugin/uis/views'),
  argumentUIs: resolve(__dirname, 'canvas_plugin/uis/arguments'),
};

const lstat = promisify(fs.lstat);
const readdir = promisify(fs.readdir);

const isDirectory = path =>
  lstat(path)
    .then(stat => stat.isDirectory())
    .catch(() => false);

const isDirname = (p, name) => path.basename(p) === name;

const getKibanaPluginsPath = () => {
  const basePluginPath = path.resolve(__dirname, '..', '..', '..');

  // find the kibana path in dev mode
  if (isDirname(basePluginPath, 'kibana')) return path.join(basePluginPath, 'plugins');

  // find the kibana path in the build, which lives in node_modules and requires going 1 path up
  const buildPluginPath = path.join(basePluginPath, '..');
  if (isDirname(basePluginPath, 'node_modules')) {
    const pluginPath = path.join(buildPluginPath, 'plugins');
    return isDirectory(pluginPath) && pluginPath;
  }

  return false;
};

export const registerPluginPaths = () => {
  const types = Object.keys(pluginPaths);
  types.forEach(type => {
    const typePath = pathStructures[type];

    async function findPlugins(directory) {
      const isDir = await isDirectory(directory);
      if (!isDir) return;

      const names = await readdir(directory); // Get names of everything in the directory
      return names
        .filter(name => name[0] !== '.')
        .map(name => path.resolve(directory, name, canvasPluginDirectoryName, ...typePath));
    }

    return findPlugins(getKibanaPluginsPath())
      .then(dirs => {
        return dirs.reduce((list, dir) => {
          if (!dir) return list;
          return list.concat(dir);
        }, []);
      })
      .then(possibleCanvasPlugins => {
        // Check how many are directories. If lstat fails it doesn't exist anyway.
        return Promise.all(
          // An array
          possibleCanvasPlugins.map(async pluginPath => {
            return isDirectory(pluginPath);
          })
        ).then(isDirectory => {
          return possibleCanvasPlugins.filter((pluginPath, i) => isDirectory[i]);
        });
      })
      .then(canvasPluginDirectories => {
        return Promise.all(
          canvasPluginDirectories.map(dir =>
            // Get the full path of all files in the directory
            readdir(dir).then(files => files.map(file => path.resolve(dir, file)))
          )
        ).then(dirs => {
          flatten(dirs).forEach(dir => {
            console.log('Registering:', type, dir);
            pathsRegistry.register(type, dir);
          });
        });
      });
  });
};
