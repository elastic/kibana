/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { xpackInfoSignature } from 'plugins/xpack_main/services/xpack_info_signature';
import { mockWindow } from './_mock_window';

const XPACK_INFO_SIG_KEY = 'xpackMain.infoSignature';

describe('xpack_info_signature service', () => {
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

  it ('updates the stored xpack info signature', () => {
    const updatedXPackInfoSignature = 'foobar';
    xpackInfoSignature.set(updatedXPackInfoSignature);
    expect(mockWindow.sessionStorage.getItem(XPACK_INFO_SIG_KEY)).to.be(updatedXPackInfoSignature);
    expect(xpackInfoSignature.get()).to.be(updatedXPackInfoSignature);
  });

  it ('clears the stored xpack info signature', () => {
    const updatedXPackInfoSignature = 'foobar';
    xpackInfoSignature.set(updatedXPackInfoSignature);
    expect(xpackInfoSignature.get()).not.to.be(undefined);

    xpackInfoSignature.clear();
    expect(mockWindow.sessionStorage.getItem(XPACK_INFO_SIG_KEY)).to.be(undefined);
    expect(xpackInfoSignature.get()).to.be(undefined);
  });
});
