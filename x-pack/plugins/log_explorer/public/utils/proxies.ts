/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates a Proxy in which certain property accesses are redirected to
 * replacement factories.
 *
 * @param target the object to proxy
 * @param replacements a map of keys to replacement factories
 * @returns a proxy of the object
 */
export const createPropertyGetProxy = <Target extends object, Key extends keyof Target>(
  target: Target,
  replacements: {
    [key in Key]: (value: Target[Key]) => Target[Key];
  }
) =>
  new Proxy(target, {
    get(accessedTarget, accessedKey, ...rest) {
      const value = Reflect.get(accessedTarget, accessedKey, ...rest);
      if (hasKey(replacements, accessedKey)) {
        return replacements[accessedKey](value);
      } else {
        return value;
      }
    },
  });

const proxySingletonCache = new Map();
/**
 * An enhanced version of createPropertyGetProxy that stores in cache the created proxy
 * to keep referential stability for certain use cases
 *
 * @param export the key to store the proxy
 * @param target the object to proxy
 * @param replacements a map of keys to replacement factories
 * @returns a proxy of the object
 */
export const createPropertyGetProxySingleton = <Target extends object, Key extends keyof Target>(
  proxyKey: string,
  target: Target,
  replacements: {
    [key in Key]: (value: Target[Key]) => Target[Key];
  }
): Target => {
  if (!proxySingletonCache.has(proxyKey)) {
    proxySingletonCache.set(proxyKey, createPropertyGetProxy(target, replacements));
  }

  return proxySingletonCache.get(proxyKey);
};

const hasKey = <T extends object, K extends keyof T>(
  obj: T,
  key: string | number | symbol
): key is K => obj.hasOwnProperty(key);
