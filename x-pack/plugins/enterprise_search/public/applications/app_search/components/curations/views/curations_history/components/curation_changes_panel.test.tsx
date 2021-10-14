/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { DataPanel } from '../../../../data_panel';

import { CurationChangesPanel } from './curation_changes_panel';

describe('CurationChangesPanel', () => {
  it('renders', () => {
    const wrapper = shallow(<CurationChangesPanel />);

    expect(wrapper.is(DataPanel)).toBe(true);
  });
});
