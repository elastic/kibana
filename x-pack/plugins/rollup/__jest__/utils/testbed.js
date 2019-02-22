/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { mountWithIntl } from 'test_utils/enzyme_helpers'; // eslint-disable-line import/no-unresolved
import { findTestSubject as findTestSubjectHelper } from '@elastic/eui/lib/test';

const registerTestSubjExists = component => (testSubject, count = 1) => findTestSubjectHelper(component, testSubject).length === count;

export const registerTestBed = (Component, defaultProps, store = {}) => (props) => {
  const component = mountWithIntl(
    <Provider store={store}>
      <Component
        {...defaultProps}
        {...props}
      />
    </Provider>
  );

  const setProps = (props) => component.setProps({
    children: (
      <Component
        {...defaultProps}
        {...props}
      />
    )
  });

  const testSubjectExists = registerTestSubjExists(component);
  const findTestSubject = testSubject => findTestSubjectHelper(component, testSubject);

  return { component, testSubjectExists, findTestSubject, setProps };
};
