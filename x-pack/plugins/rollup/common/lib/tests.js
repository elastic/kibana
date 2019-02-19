/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { findTestSubject as findTestSubjectHelper } from '@elastic/eui/lib/test';

const registerTestSubjExists = component => testSubject => Boolean(findTestSubjectHelper(component, testSubject).length);

export const registerTestBed = (Component, mountWithIntl, defaultProps, store = {}) => (props) => {
  const wrapped = mountWithIntl(
    <Provider store={store}>
      <Component
        {...defaultProps}
        {...props}
      />
    </Provider>
  );

  const component = wrapped.find(Component);

  const setProps = (props) => wrapped.setProps({
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
