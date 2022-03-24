/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../../__mocks__/kea_logic';
import { sourceConfigData } from '../../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSteps } from '@elastic/eui';

import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../../components/layout';
import { staticSourceData } from '../../../source_data';

import { ExternalConnectorConfig } from './external_connector_config';
import { ExternalConnectorFormFields } from './external_connector_form_fields';

describe('ExternalConnectorConfig', () => {
  const goBack = jest.fn();
  const onDeleteConfig = jest.fn();
  const setExternalConnectorApiKey = jest.fn();
  const setExternalConnectorUrl = jest.fn();
  const saveExternalConnectorConfig = jest.fn();
  const fetchExternalSource = jest.fn();

  const props = {
    sourceData: staticSourceData[0],
    goBack,
    onDeleteConfig,
  };

  const values = {
    sourceConfigData,
    buttonLoading: false,
    clientIdValue: 'foo',
    clientSecretValue: 'bar',
    baseUrlValue: 'http://foo.baz',
    hasPlatinumLicense: true,
    isOrganization: true,
  };

  beforeEach(() => {
    setMockActions({
      setExternalConnectorApiKey,
      setExternalConnectorUrl,
      saveExternalConnectorConfig,
      fetchExternalSource,
    });
    setMockValues({ ...values });
  });

  it('renders', () => {
    const wrapper = shallow(<ExternalConnectorConfig {...props} />);

    expect(wrapper.find(EuiSteps)).toHaveLength(1);
    expect(wrapper.find(EuiSteps).dive().find(ExternalConnectorFormFields)).toHaveLength(1);
  });

  it('renders organizstion layout', () => {
    const wrapper = shallow(<ExternalConnectorConfig {...props} />);

    expect(wrapper.find(WorkplaceSearchPageTemplate)).toHaveLength(1);
  });

  it('should show correct layout for personal dashboard', () => {
    setMockValues({ ...values, isOrganization: false });
    const wrapper = shallow(<ExternalConnectorConfig {...props} />);

    expect(wrapper.find(WorkplaceSearchPageTemplate)).toHaveLength(0);
    expect(wrapper.find(PersonalDashboardLayout)).toHaveLength(1);
  });

  it('handles form submission', () => {
    const wrapper = shallow(<ExternalConnectorConfig {...props} />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(saveExternalConnectorConfig).toHaveBeenCalled();
  });
});
