/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { flatten } from 'lodash';
import { pluginPaths } from './plugin_paths';

const lstat = promisify(fs.lstat);
const readdir = promisify(fs.readdir);

const canvasPluginDirectoryName = 'canvas_plugin';

// These must all exist
const paths = [
  path.resolve(__dirname, '..', '..', '..'), // Canvas core plugins
  path.resolve(__dirname, '..', '..', '..', '..', '..', 'plugins'), // Kibana plugin directory
];

export const getPluginPaths = type => {
  const typePath = pluginPaths[type];
  if (!typePath) throw new Error(`Unknown type: ${type}`);

  function findPlugins(directory) {
    return readdir(directory) // Get names of everything in the directory
      .then(names => names.filter(name => name[0] !== '.')) // Filter out names that start with .
      .then(names => {
        // Create paths to stuff that might have a canvas plugin of the provided type
        return names.map(name =>
          path.resolve(directory, name, canvasPluginDirectoryName, ...typePath)
        );
      });
  }

  return Promise.all(paths.map(findPlugins))
    .then(lists => [].concat(...lists))
    .then(possibleCanvasPlugins => {
      // Check how many are directories. If lstat fails it doesn't exist anyway.
      return Promise.all(
        // An array
        possibleCanvasPlugins.map(
          pluginPath =>
            lstat(pluginPath)
              .then(stat => stat.isDirectory()) // Exists and is a directory
              .catch(() => false) // I guess it doesn't exist, so whaevs
        )
      ).then(isDirectory => possibleCanvasPlugins.filter((pluginPath, i) => isDirectory[i]));
    })
    .then(canvasPluginDirectories => {
      return Promise.all(
        canvasPluginDirectories.map(dir =>
          // Get the full path of all files in the directory
          readdir(dir).then(files => files.map(file => path.resolve(dir, file)))
        )
      ).then(flatten);
    });
};
