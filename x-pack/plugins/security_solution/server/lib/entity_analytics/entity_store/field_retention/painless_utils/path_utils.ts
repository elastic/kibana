/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a dot notation path to a bracket notation path
 * e.g "a.b.c" => "a['b']['c']"
 * @param {string} path
 * @return {*}  {string}
 */
export const convertPathToBracketNotation = (path: string): string => {
  const [first, ...parts] = path.split('.');
  return first + parts.map((part) => `['${part}']`).join('');
};

/**
 * Converts a dot notation path to a list of progressive paths
 * e.g "a.b.c" => ["a", "a['b']", "a['b']['c']"]
 * if the path is "ctx.a.b.c", it will not return a ctx element
 * because we will not need to check if ctx is null
 *
 * @param {string} path The path to convert
 * @return {*}  {string[]} The list of progressive paths
 */
export const getProgressivePathsNoCtx = (path: string): string[] => {
  // capture groups for the path and the bracket notation
  // e.g "a['b']['c']" => ["a", "['b']", "['c']"]
  const regex = /([^[\]]+)|(\['[^']+'\])/g;
  const matches = [...path.matchAll(regex)];
  let currentPath = '';
  const paths: string[] = [];

  matches.forEach((match) => {
    currentPath += match[0];
    // Skip the path if it is 'ctx'
    if (currentPath !== 'ctx') {
      paths.push(currentPath);
    }
  });

  return paths;
};
