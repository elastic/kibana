/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, mockTelemetryActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButtonIcon, EuiCopy, EuiFieldText } from '@elastic/eui';

import { ElasticsearchCloudId } from './';

const execCommandMock = (global.document.execCommand = jest.fn());
const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('Elasticsearch Cloud Id', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    setMockValues({ cloud: { cloudId: 'example-cloud-id' } });
    wrapper = shallow(<ElasticsearchCloudId />);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility conditions', () => {
    it('renders panel when cloud id is provided', () => {
      expect(wrapper.find('[data-test-subj="CloudIdPanel"]')).toHaveLength(1);
    });

    it('is hidden when cloud id isnt available', () => {
      setMockValues({ cloud: { cloudId: null } });
      wrapper = shallow(<ElasticsearchCloudId />);
      expect(wrapper.find('[data-test-subj="CloudIdPanel"]')).toHaveLength(0);
    });
  });

  describe('Cloud Id Interactions', () => {
    it('should be able copy cloud id', () => {
      const field = wrapper.find(EuiFieldText).dive();

      expect(field.props()).toEqual(
        expect.objectContaining({
          readOnly: true,
        })
      );
      expect(field.find('input').props()).toEqual(
        expect.objectContaining({
          value: 'example-cloud-id',
        })
      );

      const euiCopyHOC = field.dive().find(EuiCopy);
      expect(euiCopyHOC.props().textToCopy).toEqual('example-cloud-id');
      const copyButton = euiCopyHOC.dive().find(EuiButtonIcon);
      expect(copyButton).toHaveLength(1);
      execCommandMock.mockImplementationOnce(() => true);

      copyButton.simulate('click');
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
        action: 'clicked',
        metric: 'cloud_id',
      });
    });

    it('should fail gracefully if not allowed to copy', () => {
      const field = wrapper.find(EuiFieldText).dive();
      const euiCopyHOC = field.dive().find(EuiCopy);
      const copyButton = euiCopyHOC.dive().find(EuiButtonIcon);
      execCommandMock.mockImplementationOnce(() => false);

      copyButton.simulate('click');
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(warn).toHaveBeenCalledWith('Unable to copy to clipboard.');
      expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalled();
    });
  });
});
