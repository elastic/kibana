/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { globalNode } from '../../mock';
import { AutoDownload } from './auto_download';

describe('AutoDownload', () => {
  beforeEach(() => {
    Object.defineProperty(globalNode.window.URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  it('calls onDownload once if a blob is provided', () => {
    const onDownload = jest.fn();
    mount(<AutoDownload blob={new Blob([''])} onDownload={onDownload} />);

    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it('does not call onDownload if no blob is provided', () => {
    const onDownload = jest.fn();
    mount(<AutoDownload blob={undefined} onDownload={onDownload} />);

    expect(onDownload).not.toHaveBeenCalled();
  });
});
