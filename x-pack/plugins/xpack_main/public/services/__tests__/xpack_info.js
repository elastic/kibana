/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { mockWindow } from './_mock_window';

const XPACK_INFO_KEY = 'xpackMain.info';

describe('xpack_info service', () => {
  let xpackInfo;

  beforeEach(ngMock.module('kibana', () => {
    sinon.stub(sessionStorage, 'getItem')
      .callsFake(mockWindow.sessionStorage.getItem);
    sinon.stub(sessionStorage, 'setItem')
      .callsFake(mockWindow.sessionStorage.setItem);
    sinon.stub(sessionStorage, 'removeItem')
      .callsFake(mockWindow.sessionStorage.removeItem);
  }));

  afterEach(() => {
    sessionStorage.getItem.restore();
    sessionStorage.setItem.restore();
    sessionStorage.removeItem.restore();
  });

  beforeEach(ngMock.inject((Private) => {
    xpackInfo = Private(XPackInfoProvider);
  }));

  it ('updates the stored xpack info', () => {
    const updatedXPackInfo = {
      foo: {
        bar: 17
      }
    };
    xpackInfo.setAll(updatedXPackInfo);
    expect(mockWindow.sessionStorage.getItem(XPACK_INFO_KEY)).to.be(JSON.stringify(updatedXPackInfo));
    expect(xpackInfo.get('foo.bar')).to.be(17);
  });

  it ('clears the stored xpack info', () => {
    const updatedXPackInfo = {
      foo: {
        bar: 17
      }
    };
    xpackInfo.setAll(updatedXPackInfo);
    expect(xpackInfo.get('foo.bar')).not.to.be(undefined);

    xpackInfo.clear();
    expect(mockWindow.sessionStorage.getItem(XPACK_INFO_KEY)).to.be(undefined);
    expect(xpackInfo.get('foo.bar')).to.be(undefined);
  });

  it ('defaults to the provided default value if the requested path is not found', () => {
    xpackInfo.setAll({ foo: 'bar' });
    expect(xpackInfo.get('foo.baz', 17)).to.be(17);
  });
});
