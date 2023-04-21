/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { TextExpansionCallOut } from './text_expansion_callout';
import { EuiButton } from '@elastic/eui';

// jest.mock('./text_expansion_callout_data', () => ({
//   useTextExpansionCallOutData: jest.fn().mockResolvedValue({
//     dismiss: jest.fn(),
//     isCreateButtonDisabled: false,
//     isDismissable: false,
//     show: true,
//   }),
// }));

jest.mock('./text_expansion_callout_data', () => {
  console.log('mock text_expansion_callout_data')
  return {
    useTextExpansionCallOutData: jest.fn(() => {
      console.log('mock useTextExpansionCallOutData()')
      return {
        dismiss: jest.fn(),
        isCreateButtonDisabled: false,
        isDismissable: false,
        show: true,
      }
    }),
  }
});

const DEFAULT_VALUES = {
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
};

describe('TextExpansionCallOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES); // useValues
  });
  it('renders panel with deploy button if the model is not deployed', () => {
    const wrapper = shallow(<TextExpansionCallOut isDismissable={false} />);
    expect(wrapper.find(EuiButton).length).toBe(1);
    const button = wrapper.find(EuiButton);
    expect(button.prop('isDisabled')).toBe(false);
  });
});
