/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n/react';
import { mount, shallow } from 'enzyme';
import React from 'react';
import { mockKibanaSemverVersion } from '../../../../../../../../common/constants';

import { ReindexWarning } from '../../../../../../../../common/types';
import { idForWarning, WarningsFlyoutStep } from './warnings_step';

jest.mock('../../../../../../app_context', () => {
  return {
    useAppContext: () => {
      return {
        docLinks: {
          DOC_LINK_VERSION: 'current',
          ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        },
        kibanaVersionInfo: {
          currentMajor: mockKibanaSemverVersion.major,
          prevMajor: mockKibanaSemverVersion.major - 1,
          nextMajor: mockKibanaSemverVersion.major + 1,
        },
      };
    },
  };
});

describe('WarningsFlyoutStep', () => {
  const defaultProps = {
    advanceNextStep: jest.fn(),
    warnings: [ReindexWarning.customTypeName],
    closeFlyout: jest.fn(),
    renderGlobalCallouts: jest.fn(),
  };

  it('renders', () => {
    expect(shallow(<WarningsFlyoutStep {...defaultProps} />)).toMatchSnapshot();
  });

  if (mockKibanaSemverVersion.major === 7) {
    it('does not allow proceeding until all are checked', () => {
      const wrapper = mount(
        <I18nProvider>
          <WarningsFlyoutStep {...defaultProps} />
        </I18nProvider>
      );
      const button = wrapper.find('EuiButton');

      button.simulate('click');
      expect(defaultProps.advanceNextStep).not.toHaveBeenCalled();

      wrapper.find(`input#${idForWarning(ReindexWarning.customTypeName)}`).simulate('change');
      button.simulate('click');
      expect(defaultProps.advanceNextStep).toHaveBeenCalled();
    });
  }
});
