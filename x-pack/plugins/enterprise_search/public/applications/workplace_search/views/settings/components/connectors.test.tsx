/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__';

import { configuredSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { Loading } from '../../../../shared/loading';
import { LicenseCallout } from '../../../components/shared/license_callout';

import { Connectors } from './connectors';

describe('Connectors', () => {
  const initializeConnectors = jest.fn();

  beforeEach(() => {
    setMockActions({ initializeConnectors });
    setMockValues({ connectors: configuredSources });
  });

  it('renders', () => {
    const wrapper = shallow(<Connectors />);

    expect(wrapper.find('[data-test-subj="ConnectorRow"]')).toHaveLength(configuredSources.length);
  });

  it('returns loading when loading', () => {
    setMockValues({
      connectors: configuredSources,
      dataLoading: true,
    });
    const wrapper = shallow(<Connectors />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders LicenseCallout for restricted items', () => {
    const wrapper = shallow(<Connectors />);

    const numUnsupportedAccountOnly = configuredSources.filter(
      (s) => s.accountContextOnly && !s.supportedByLicense
    ).length;
    expect(wrapper.find(LicenseCallout)).toHaveLength(numUnsupportedAccountOnly);
  });
});
