/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import '../../../common/mock/match_media';
import { ExternalServiceColumn } from './columns';

import { useGetCasesMockState } from '../../containers/mock';

describe('ExternalServiceColumn ', () => {
  it('Not pushed render', () => {
    const wrapper = mount(
      <ExternalServiceColumn {...{ theCase: useGetCasesMockState.data.cases[0] }} />
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-notPushed"]`).last().exists()
    ).toBeTruthy();
  });
  it('Up to date', () => {
    const wrapper = mount(
      <ExternalServiceColumn {...{ theCase: useGetCasesMockState.data.cases[1] }} />
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-upToDate"]`).last().exists()
    ).toBeTruthy();
  });
  it('Needs update', () => {
    const wrapper = mount(
      <ExternalServiceColumn {...{ theCase: useGetCasesMockState.data.cases[2] }} />
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-requiresUpdate"]`).last().exists()
    ).toBeTruthy();
  });
});
