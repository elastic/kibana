/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { ShallowWrapper, shallow } from 'enzyme';

import { EuiPanel, EuiText, EuiHorizontalRule } from '@elastic/eui';

import { staticCustomSourceData } from '../source_data';

import { CustomSourceDeployment } from './custom_source_deployment';
import { SourceIdentifier } from './source_identifier';

const customSource = {
  id: 'id',
  accessToken: 'token',
  name: 'name',
};

const preconfiguredSourceData = {
  ...staticCustomSourceData,
  serviceType: 'sharepoint-server',
  configuration: {
    ...staticCustomSourceData.configuration,
    githubRepository: 'elastic/sharepoint-server-connector',
  },
};
const mockValues = {
  sourceData: staticCustomSourceData,
};

describe('CustomSourceDeployment', () => {
  describe('default behavior', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      jest.clearAllMocks();
      setMockValues(mockValues);

      wrapper = shallow(
        <CustomSourceDeployment source={customSource} sourceData={staticCustomSourceData} />
      );
    });

    it('contains a source identifier', () => {
      expect(wrapper.find(SourceIdentifier)).toHaveLength(1);
    });

    it('includes a link to generic documentation', () => {
      expect(wrapper.find('[data-test-subj="GenericDocumentationLink"]')).toHaveLength(1);
    });
  });

  describe('for pre-configured custom sources', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      jest.clearAllMocks();
      setMockValues({
        ...mockValues,
        sourceData: {},
      });

      wrapper = shallow(
        <CustomSourceDeployment source={customSource} sourceData={preconfiguredSourceData} />
      );
    });

    it('includes a to the github repository', () => {
      expect(wrapper.find('[data-test-subj="GithubRepositoryLink"]')).toHaveLength(1);
    });

    it('includes a link to service-type specific documentation', () => {
      expect(wrapper.find('[data-test-subj="PreconfiguredDocumentationLink"]')).toHaveLength(1);
    });
  });

  it('can render a small version', () => {
    jest.clearAllMocks();
    setMockValues(mockValues);

    const wrapper = shallow(
      <CustomSourceDeployment small source={customSource} sourceData={staticCustomSourceData} />
    );

    expect(wrapper.find(EuiPanel).prop('paddingSize')).toEqual('m');

    expect(wrapper.find(EuiText).prop('size')).toEqual('s');

    expect(wrapper.find(EuiHorizontalRule).prop('margin')).toEqual('s');
  });
});
