/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_WRAPPER_CLASS } from '@kbn/core/public';

export const CONTAINER_CLASSNAME = 'infra-container-element';

export const prepareMountElement = (element: HTMLElement, testSubject?: string) => {
  // Ensure all wrapping elements have the APP_WRAPPER_CLASS so that the KinanaPageTemplate works as expected
  element.classList.add(APP_WRAPPER_CLASS);

  if (testSubject) {
    element.setAttribute('data-test-subj', testSubject);
  }
};
