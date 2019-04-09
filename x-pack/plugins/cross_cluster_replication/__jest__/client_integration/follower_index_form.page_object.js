/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { findTestSubject } from '../../../../test_utils';
import { withRoute } from '../../../../test_utils/react_router_helpers';
import { setInputValue } from '../../../../test_utils/form_helpers';
import { mountWithIntl } from '../../../../test_utils/enzyme_helpers';
import { ccrStore } from '../../public/app/store';

export class FollowerIndexFormPageObject {
  constructor(Component, props = {}, options = {
    memoryRouter: {
      wrapRoute: true,
    },
  }) {
    const Comp = options.memoryRouter.wrapRoute === false
      ? Component
      : withRoute(Component, options.memoryRouter.componentRoutePath, options.memoryRouter.onRouter);

    this.component = mountWithIntl(
      <Provider store={ccrStore}>
        <MemoryRouter
          initialEntries={options.memoryRouter.initialEntries || ['/']}
          initialIndex={options.memoryRouter.initialIndex || 0}
        >
          <Comp {...props} />
        </MemoryRouter>
      </Provider>
    );
  }

  find = (testSubject) => {
    return findTestSubject(this.component, testSubject);
  };

  clickSave = () => {
    this.getSaveFormButton().simulate('click');
  };

  getLoadingRemoteClusters = () => {
    return this.find('remoteClustersLoading');
  };

  getDocsButton = () => {
    return this.find('followerIndexDocsButton');
  };

  getForm = () => {
    return this.find('ccrFollowerIndexForm');
  };

  getFormError = () => {
    return this.find('followerIndexFormError');
  };

  getSaveFormButton = () => {
    return this.find('ccrFollowerIndexFormSubmitButton');
  };

  getFormErrorMessages = () => {
    const errorMessagesWrappers = this.component.find('.euiFormErrorText');
    return errorMessagesWrappers.map(err => err.text());
  };

  setLeaderIndex = (value) => {
    setInputValue(this.component, 'ccrFollowerIndexFormLeaderIndexInput', value);
  };

  setFollowerIndex = (value) => {
    setInputValue(this.component, 'ccrFollowerIndexFormFollowerIndexInput', value);
  };

  setAdvancedSettingsVisible = (on = true) => {
    findTestSubject(this.component, 'ccrFollowerIndexFormCustomAdvancedSettingsToggle')
      .simulate('change', { target: { checked: on } });
  };
}
