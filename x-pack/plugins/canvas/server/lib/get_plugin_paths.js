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

const isDirectory = path =>
  lstat(path)
    .then(stat => stat.isDirectory())
    .catch(() => false);

const isDirname = (p, name) => path.basename(p) === name;

const getKibanaPluginsPath = () => {
  const basePluginPath = path.resolve(__dirname, '..', '..', '..', '..', '..');

  // find the kibana path in dev mode
  if (isDirname(basePluginPath, 'kibana')) return path.join(basePluginPath, 'plugins');

  // find the kibana path in the build, which lives in node_modules and requires going 1 path up
  const buildPluginPath = path.join(basePluginPath, '..');
  if (isDirname(basePluginPath, 'node_modules') && isDirname(buildPluginPath, 'kibana'))
    return path.join(buildPluginPath, 'plugins');

  return false;
};

// These must all exist
const paths = [
  path.resolve(__dirname, '..', '..', '..'), // Canvas core plugins
  getKibanaPluginsPath(), // Kibana plugin directory
].filter(Boolean);

export const getPluginPaths = type => {
  const typePath = pluginPaths[type];
  if (!typePath) throw new Error(`Unknown type: ${type}`);

  async function findPlugins(directory) {
    const isDir = await isDirectory(directory);
    if (!isDir) return;

    const names = await readdir(directory); // Get names of everything in the directory
    return names
      .filter(name => name[0] !== '.')
      .map(name => path.resolve(directory, name, canvasPluginDirectoryName, ...typePath));
  }

  return Promise.all(paths.map(findPlugins))
    .then(dirs =>
      dirs.reduce((list, dir) => {
        if (!dir) return list;
        return list.concat(dir);
      }, [])
    )
    .then(possibleCanvasPlugins => {
      // Check how many are directories. If lstat fails it doesn't exist anyway.
      return Promise.all(
        // An array
        possibleCanvasPlugins.map(pluginPath => isDirectory(pluginPath))
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
