/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';
import { GenericDownloaderComponent, ExportSelectedData } from './index';
import { errorToToaster } from '../toasters';

jest.mock('../toasters', () => ({
  useStateToaster: jest.fn(() => [jest.fn(), jest.fn()]),
  errorToToaster: jest.fn(),
}));

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

  test('show toaster with correct error message if error occurrs', () => {
    mount(
      <GenericDownloaderComponent
        filename={'export_rules.ndjson'}
        onExportSuccess={jest.fn()}
        exportSelectedData={('some error' as unknown) as ExportSelectedData}
        ids={['123']}
      />
    );
    expect((errorToToaster as jest.Mock).mock.calls[0][0].title).toEqual('Failed to export data…');
  });
});
