/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React, { useContext } from 'react';
import { shallow } from 'enzyme';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

import { EngineOverviewHeader } from '../engine_overview_header';

describe('EngineOverviewHeader', () => {
  describe('when enterpriseSearchUrl is set', () => {
    let button;

    beforeAll(() => {
      useContext.mockImplementationOnce(() => ({ enterpriseSearchUrl: 'http://localhost:3002' }));
      const wrapper = shallow(<EngineOverviewHeader />);
      button = wrapper.find('[data-test-subj="launchButton"]');
    });

    describe('the Launch App Search button', () => {
      it('should not be disabled', () => {
        expect(button.props().isDisabled).toBeFalsy();
      });

      it('should use the enterpriseSearchUrl as the base path for its href', () => {
        expect(button.props().href).toBe('http://localhost:3002/as');
      });

      it('should send telemetry when clicked', () => {
        button.simulate('click');
        expect(sendTelemetry).toHaveBeenCalled();
      });
    });
  });

  describe('when enterpriseSearchUrl is not set', () => {
    let button;

    beforeAll(() => {
      useContext.mockImplementationOnce(() => ({ enterpriseSearchUrl: undefined }));
      const wrapper = shallow(<EngineOverviewHeader />);
      button = wrapper.find('[data-test-subj="launchButton"]');
    });

    describe('the Launch App Search button', () => {
      it('should be disabled', () => {
        expect(button.props().isDisabled).toBe(true);
      });

      it('should not have an href', () => {
        expect(button.props().href).toBeUndefined();
      });
    });
  });
});
