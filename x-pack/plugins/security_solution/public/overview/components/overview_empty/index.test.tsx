/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { OverviewEmpty } from '.';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { getAppLandingUrl } from '../../../common/components/link_to/redirect_to_overview';

const mockNavigateToApp = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          ...original.useKibana().services.application,
          navigateToApp: mockNavigateToApp,
        },
      },
    }),
  };
});

describe('Redirect to landing page', () => {
  it('render with correct actions ', () => {
    shallow(<OverviewEmpty />);
    expect(mockNavigateToApp).toHaveBeenCalledWith(APP_UI_ID, {
      deepLinkId: SecurityPageName.landing,
      path: getAppLandingUrl(),
    });
  });
});
