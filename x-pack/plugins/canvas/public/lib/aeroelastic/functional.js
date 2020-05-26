/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * flatten
 *
 * Flattens an array of arrays into an array
 *
 * @param {*[][]} arrays
 * @returns *[]
 */
export const flatten = (arrays) => [].concat(...arrays);

/**
 * identity
 *
 * @param d
 * @returns d
 */
export const identity = (d) => d;

/**
 * map
 *
 * Maps a function over an array
 *
 * Passing the index and the array are avoided
 *
 * @param {Function} fun
 * @returns {function(*): *}
 */
export const map = (fun) => (array) => array.map((value) => fun(value));

/**
 * disjunctiveUnion
 *
 * @param {Function} keyFun
 * @param {*[]} set1
 * @param {*[]} set2
 * @returns *[]
 */
export const disjunctiveUnion = (keyFun, set1, set2) =>
  set1
    .filter((s1) => !set2.find((s2) => keyFun(s2) === keyFun(s1)))
    .concat(set2.filter((s2) => !set1.find((s1) => keyFun(s1) === keyFun(s2))));

/**
 *
 * @param {number} a
 * @param {number} b
 * @returns {number} the mean of the two parameters
 */
export const mean = (a, b) => (a + b) / 2;

export const shallowEqual = (a, b) => {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

export const not = (fun) => (...args) => !fun(...args);

export const removeDuplicates = (idFun, a) =>
  a.filter((d, i) => a.findIndex((s) => idFun(s) === idFun(d)) === i);

export const arrayToMap = (a) => Object.assign({}, ...a.map((d) => ({ [d]: true })));

export const subMultitree = (pk, fk, elements, inputRoots) => {
  const getSubgraphs = (roots) => {
    const children = flatten(roots.map((r) => elements.filter((e) => fk(e) === pk(r))));
    if (children.length) {
      return [...roots, ...getSubgraphs(children, elements)];
    } else {
      return roots;
    }
  };
  return getSubgraphs(inputRoots);
};
