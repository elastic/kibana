/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import { configuredSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { LicenseCallout } from '../../../components/shared/license_callout';

import { Connectors } from './connectors';

describe('Connectors', () => {
  const initializeConnectors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions({ initializeConnectors });
    setMockValues({ connectors: configuredSources });
  });

  it('renders', () => {
    const wrapper = shallow(<Connectors />);

    expect(wrapper.find('[data-test-subj="ConnectorRow"]')).toHaveLength(configuredSources.length);
  });

  it('hides external connectors if they are not described', () => {
    setMockValues({
      connectors: [
        ...configuredSources,
        {
          name: 'Custom Connector Package',
          serviceType: 'external',
          externalConnectorServiceDescribed: false,
        },
      ],
    });
    const wrapper = shallow(<Connectors />);

    expect(wrapper.find('[data-test-subj="ConnectorRow"]')).toHaveLength(configuredSources.length);
  });

  it('renders LicenseCallout for restricted items', () => {
    const wrapper = shallow(<Connectors />);

    const numUnsupportedAccountOnly = configuredSources.filter(
      (s) => s.accountContextOnly && !s.supportedByLicense
    ).length;
    expect(wrapper.find(LicenseCallout)).toHaveLength(numUnsupportedAccountOnly);
  });
});
