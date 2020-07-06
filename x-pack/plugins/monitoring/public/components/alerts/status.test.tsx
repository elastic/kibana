/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Legacy } from '../../legacy_shims';
import { AlertsStatus, AlertsStatusProps } from './status';
import { ALERT_TYPES } from '../../../common/constants';
import { getSetupModeState } from '../../lib/setup_mode';
import { mockUseEffects } from '../../jest.helpers';

jest.mock('../../lib/setup_mode', () => ({
  getSetupModeState: jest.fn(),
  addSetupModeCallback: jest.fn(),
  toggleSetupMode: jest.fn(),
}));

jest.mock('../../legacy_shims', () => ({
  Legacy: {
    shims: {
      kfetch: jest.fn(),
      docLinks: {
        ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        DOC_LINK_VERSION: 'current',
      },
    },
  },
}));

const defaultProps: AlertsStatusProps = {
  clusterUuid: '1adsb23',
  emailAddress: 'test@elastic.co',
};

describe('Status', () => {
  beforeEach(() => {
    mockUseEffects(2);

    (getSetupModeState as jest.Mock).mockReturnValue({
      enabled: false,
    });

    (Legacy.shims.kfetch as jest.Mock).mockImplementation(({ pathname }) => {
      if (pathname === '/internal/security/api_key/privileges') {
        return { areApiKeysEnabled: true };
      }
      return {
        data: [],
      };
    });
  });

  it('should render without setup mode', () => {
    const component = shallow(<AlertsStatus {...defaultProps} />);
    expect(component).toMatchSnapshot();
  });

  it('should render a flyout when clicking the link', async () => {
    (getSetupModeState as jest.Mock).mockReturnValue({
      enabled: true,
    });

    const component = shallow(<AlertsStatus {...defaultProps} />);
    component.find('EuiLink').simulate('click');
    await component.update();
    expect(component.find('EuiFlyout')).toMatchSnapshot();
  });

  it('should render a success message if all alerts have been migrated and in setup mode', async () => {
    (Legacy.shims.kfetch as jest.Mock).mockReturnValue({
      data: ALERT_TYPES.map((type) => ({ alertTypeId: type })),
    });

    (getSetupModeState as jest.Mock).mockReturnValue({
      enabled: true,
    });

    const component = shallow(<AlertsStatus {...defaultProps} />);
    await component.update();
    expect(component.find('EuiCallOut')).toMatchSnapshot();
  });
});
