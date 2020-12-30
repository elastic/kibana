/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';

import { TrustedAppCard } from '.';
import { createSampleTrustedApp } from '../../../test_utils';

describe('trusted_app_card', () => {
  describe('TrustedAppCard', () => {
    it('should render correctly', () => {
      const element = shallow(
        <TrustedAppCard trustedApp={createSampleTrustedApp(4)} onDelete={() => {}} />
      );

      expect(element).toMatchSnapshot();
    });

    it('should trim long texts', () => {
      const element = shallow(
        <TrustedAppCard trustedApp={createSampleTrustedApp(4, true)} onDelete={() => {}} />
      );

      expect(element).toMatchSnapshot();
    });
  });
});
