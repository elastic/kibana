/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/shallow_usecontext.mock';
import '../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { useValues, useActions } from 'kea';

import { mockHistory } from '../../__mocks__';

import { FlashMessagesProvider } from './';

describe('FlashMessagesProvider', () => {
  const props = { history: mockHistory as any };
  const listenToHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useActions as jest.Mock).mockImplementationOnce(() => ({ listenToHistory }));
  });

  it('does not render', () => {
    const wrapper = shallow(<FlashMessagesProvider {...props} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('listens to history on mount', () => {
    shallow(<FlashMessagesProvider {...props} />);

    expect(listenToHistory).toHaveBeenCalledWith(mockHistory);
  });

  it('does not add another history listener if one already exists', () => {
    (useValues as jest.Mock).mockImplementationOnce(() => ({ historyListener: 'exists' as any }));

    shallow(<FlashMessagesProvider {...props} />);

    expect(listenToHistory).not.toHaveBeenCalledWith(props);
  });
});
