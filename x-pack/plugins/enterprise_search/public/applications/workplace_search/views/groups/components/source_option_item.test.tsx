/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/kea.mock';

import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { SourceOptionItem } from './source_option_item';

import { TruncatedContent } from '../../../../shared/truncate';

import { SourceIcon } from '../../../components/shared/source_icon';

describe('SourceOptionItem', () => {
  it('renders', () => {
    const wrapper = shallow(<SourceOptionItem source={contentSources[0]} />);

    expect(wrapper.find(TruncatedContent)).toHaveLength(1);
    expect(wrapper.find(SourceIcon)).toHaveLength(1);
  });
});
