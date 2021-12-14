/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { DownloadDiagnosticsButton } from './download_diagnostics_button';

describe('DownloadDiagnosticsButton', () => {
  const label = 'foo123';
  const contentSource = fullContentSources[0];
  const buttonLoading = false;
  const isOrganization = true;

  const mockValues = {
    contentSource,
    buttonLoading,
    isOrganization,
  };

  beforeEach(() => {
    setMockValues(mockValues);
  });

  it('renders the Download diagnostics button with org href', () => {
    const wrapper = shallow(<DownloadDiagnosticsButton label={label} />);

    expect(wrapper.find(EuiButton).prop('href')).toEqual(
      '/internal/workplace_search/org/sources/123/download_diagnostics'
    );
  });

  it('renders the Download diagnostics button with account href', () => {
    setMockValues({ ...mockValues, isOrganization: false });
    const wrapper = shallow(<DownloadDiagnosticsButton label={label} />);

    expect(wrapper.find(EuiButton).prop('href')).toEqual(
      '/internal/workplace_search/account/sources/123/download_diagnostics'
    );
  });
});
