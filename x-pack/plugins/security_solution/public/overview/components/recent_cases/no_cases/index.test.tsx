/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { useKibana } from '../../../../common/lib/kibana';
import '../../../../common/mock/match_media';
import { TestProviders } from '../../../../common/mock';
import { NoCases } from '.';

jest.mock('../../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('RecentCases', () => {
  let navigateToApp: jest.Mock;

  beforeEach(() => {
    navigateToApp = jest.fn();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
  });

  it('if no cases, you should be able to create a case by clicking on the link "start a new case"', () => {
    const wrapper = mount(
      <TestProviders>
        <NoCases />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="no-cases-create-case"]`).first().simulate('click');
    expect(navigateToApp).toHaveBeenCalledWith('securitySolution:case', {
      path:
        "/create?timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
    });
  });
});
