/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCustomErrorClass = (className: string) => {
  const CustomError = class extends Error {
    constructor(message?: string) {
      super(message);
      Object.setPrototypeOf(this, new.target.prototype);
      // Override the error instance name
      Object.defineProperty(this, 'name', { value: className });
    }
  };
  // set class name dynamically
  Object.defineProperty(CustomError, 'name', { value: className });
  return CustomError;
};

export const MLClusterClientUninitialized = getCustomErrorClass('MLClusterClientUninitialized');

export const MLUISettingsClientUninitialized = getCustomErrorClass(
  'MLUISettingsClientUninitialized'
);

export const MLFieldFormatRegistryUninitialized = getCustomErrorClass(
  'MLFieldFormatRegistryUninitialized'
);
