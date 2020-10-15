/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CONTAINER_CLASSNAME = 'infra-container-element';

export const prepareMountElement = (element: HTMLElement) => {
  // Ensure the element we're handed from application mounting is assigned a class
  // for our index.scss styles to apply to.
  element.classList.add(CONTAINER_CLASSNAME);
};
