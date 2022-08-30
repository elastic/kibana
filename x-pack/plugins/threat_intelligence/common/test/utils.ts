/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Use this to query elements by test-subj
 * @param testSubject test subject to query elements by
 * @returns
 */
export const getByTestSubj = (testSubject: string): HTMLElement =>
  document.querySelector(`[data-test-subj="${testSubject}"]`) as HTMLElement;
