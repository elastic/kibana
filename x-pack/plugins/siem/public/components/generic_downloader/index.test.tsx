/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { GenericDownloaderComponent } from './index';

describe('GenericDownloader', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <GenericDownloaderComponent
        filename={'export_rules.ndjson'}
        onExportSuccess={jest.fn()}
        exportSelectedData={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
