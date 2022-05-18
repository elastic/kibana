/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { setMockValues } from '../__mocks__/kea_logic';
import '../__mocks__/shallow_useeffect.mock';
import '../__mocks__/enterprise_search_url.mock';

import React from 'react';

import { Redirect } from 'react-router-dom';

import { shallow } from 'enzyme';

import { SetupGuide } from '../enterprise_search_overview/components/setup_guide';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { ConnectorSettings } from './components/connector_settings';
import { CrawlerSettings } from './components/crawler_settings';
import { ErrorConnecting } from './components/error_connecting';
import { SearchIndicesRouter } from './components/search_indices';

import {
  EnterpriseSearchContent,
  EnterpriseSearchContentUnconfigured,
  EnterpriseSearchContentConfigured,
} from '.';

describe('EnterpriseSearchContent', () => {
  it('always renders the Setup Guide', () => {
    const wrapper = shallow(<EnterpriseSearchContent />);

    expect(wrapper.find(SetupGuide)).toHaveLength(1);
  });

  it('renders VersionMismatchPage when there are mismatching versions', () => {
    const wrapper = shallow(
      <EnterpriseSearchContent enterpriseSearchVersion="7.15.0" kibanaVersion="7.16.0" />
    );

    expect(wrapper.find(VersionMismatchPage)).toHaveLength(1);
  });

  it('renders EnterpriseSearchContentUnconfigured when config.host is not set', () => {
    setMockValues({ config: { host: '' } });
    const wrapper = shallow(<EnterpriseSearchContent />);

    expect(wrapper.find(EnterpriseSearchContentUnconfigured)).toHaveLength(1);
  });

  it('renders ErrorConnecting when Enterprise Search is unavailable', () => {
    setMockValues({ errorConnectingMessage: '502 Bad Gateway' });
    const wrapper = shallow(<EnterpriseSearchContent />);

    const errorConnection = wrapper.find(ErrorConnecting);
    expect(errorConnection).toHaveLength(1);
  });

  it('renders EnterpriseSearchContentConfigured when config.host is set & available', () => {
    setMockValues({ errorConnectingMessage: '', config: { host: 'some.url' } });
    const wrapper = shallow(<EnterpriseSearchContent />);

    expect(wrapper.find(EnterpriseSearchContentConfigured)).toHaveLength(1);
  });
});

describe('EnterpriseSearchContentUnconfigured', () => {
  it('redirects to the Setup Guide', () => {
    const wrapper = shallow(<EnterpriseSearchContentUnconfigured />);

    expect(wrapper.find(Redirect)).toHaveLength(1);
  });
});

describe('EnterpriseSearchContentConfigured', () => {
  const wrapper = shallow(<EnterpriseSearchContentConfigured {...DEFAULT_INITIAL_APP_DATA} />);

  it('renders engine routes', () => {
    expect(wrapper.find(SearchIndicesRouter)).toHaveLength(1);
    expect(wrapper.find(ConnectorSettings)).toHaveLength(1);
    expect(wrapper.find(CrawlerSettings)).toHaveLength(1);
  });
});
