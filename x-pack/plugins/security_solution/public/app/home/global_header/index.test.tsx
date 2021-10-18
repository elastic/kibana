/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { shallow } from 'enzyme';
import { GlobalHeader, pagesWithSourcerer } from '.';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../../common/constants';

jest.mock('../../../common/utils/route/use_route_spy', () => ({ useRouteSpy: jest.fn() }));
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest
    .fn()
    .mockReturnValue({ services: { http: { basePath: { prepend: jest.fn() } } } }),
}));
describe('global header', () => {
  const mockSetHeaderActionMenu = jest.fn();

  it('has add data link', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);
    const wrapper = shallow(<GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />);
    expect(wrapper.find('[data-test-subj="add-data"]').exists()).toBeTruthy();
  });

  it.each(pagesWithSourcerer)('shows sourcerer on %s page', (page) => {
    (useRouteSpy as jest.Mock).mockReturnValue([{ pageName: page, detailName: undefined }]);

    const wrapper = shallow(<GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />);
    expect(wrapper.find('[data-test-subj="sourcerer"]').exists()).toBeTruthy();
  });

  it('shows sourcerer on rule details page', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.rules, detailName: 'mockruleId' },
    ]);

    const wrapper = shallow(<GlobalHeader setHeaderActionMenu={mockSetHeaderActionMenu} />);
    expect(wrapper.find('[data-test-subj="sourcerer"]').exists()).toBeTruthy();
  });
});
