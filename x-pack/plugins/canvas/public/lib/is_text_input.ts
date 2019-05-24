/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// input types that aren't variations of text input
const nonTextInputs = [
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
];

export const isTextInput = ({ tagName, type }: HTMLInputElement): boolean => {
  switch (tagName.toLowerCase()) {
    case 'input':
      return !nonTextInputs.includes(type);
    case 'textarea':
      return true;
    default:
      return false;
  }
};
