/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n/react';
import { mount, shallow } from 'enzyme';
import React from 'react';
import SemVer from 'semver/classes/semver';

import { ReindexWarning } from '../../../../../../../common/types';
import { MAJOR_VERSION } from '../../../../../../../common/constants';

import { idForWarning, WarningsFlyoutStep } from './warnings_step';

const kibanaVersion = new SemVer(MAJOR_VERSION);
const mockKibanaVersionInfo = {
  currentMajor: kibanaVersion.major,
  prevMajor: kibanaVersion.major - 1,
  nextMajor: kibanaVersion.major + 1,
};

jest.mock('../../../../../app_context', () => {
  const { docLinksServiceMock } = jest.requireActual(
    '../../../../../../../../../../src/core/public/doc_links/doc_links_service.mock'
  );

  return {
    useAppContext: () => {
      return {
        docLinks: docLinksServiceMock.createStartContract(),
        kibanaVersionInfo: mockKibanaVersionInfo,
      };
    },
  };
});

describe('WarningsFlyoutStep', () => {
  const defaultProps = {
    advanceNextStep: jest.fn(),
    warnings: [] as ReindexWarning[],
    closeFlyout: jest.fn(),
    renderGlobalCallouts: jest.fn(),
  };

  it('renders', () => {
    expect(shallow(<WarningsFlyoutStep {...defaultProps} />)).toMatchSnapshot();
  });

  if (kibanaVersion.major === 7) {
    it('does not allow proceeding until all are checked', () => {
      const defaultPropsWithWarnings = {
        ...defaultProps,
        warnings: [
          {
            warningType: 'customTypeName',
            meta: {
              typeName: 'my_mapping_type',
            },
          },
          {
            warningType: 'indexSetting',
            meta: {
              deprecatedSettings: ['index.force_memory_term_dictionary'],
            },
          },
        ] as ReindexWarning[],
      };
      const wrapper = mount(
        <I18nProvider>
          <WarningsFlyoutStep {...defaultPropsWithWarnings} />
        </I18nProvider>
      );
      const button = wrapper.find('EuiButton');

      button.simulate('click');
      expect(defaultPropsWithWarnings.advanceNextStep).not.toHaveBeenCalled();

      // first warning (customTypeName)
      wrapper.find(`input#${idForWarning(0)}`).simulate('change');
      // second warning (indexSetting)
      wrapper.find(`input#${idForWarning(1)}`).simulate('change');
      button.simulate('click');

      expect(defaultPropsWithWarnings.advanceNextStep).toHaveBeenCalled();
    });
  }
});
