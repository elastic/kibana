/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

import { shallow } from 'enzyme';

import { EuiCopy, EuiButtonIcon, EuiFieldText } from '@elastic/eui';

import { CredentialItem } from '.';

const label = 'Credential';
const testSubj = 'CredentialItemTest';
const value = 'foo';

const props = { label, testSubj, value };

describe('CredentialItem', () => {
  it('renders', () => {
    const wrapper = shallow(<CredentialItem {...props} />);

    expect(wrapper.find(`[data-test-subj="${testSubj}"]`)).toHaveLength(1);
  });

  it('renders the copy button', () => {
    const copyMock = jest.fn();
    const wrapper = shallow(<CredentialItem {...props} />);

    const copyEl = shallow(<div>{wrapper.find(EuiCopy).props().children(copyMock)}</div>);
    expect(copyEl.find(EuiButtonIcon).props().onClick).toEqual(copyMock);
  });

  it('does not render copy button when hidden', () => {
    const wrapper = shallow(<CredentialItem {...props} hideCopy />);

    expect(wrapper.find(EuiCopy)).toHaveLength(0);
  });

  it('handles credential visible toggle click', () => {
    const wrapper = shallow(<CredentialItem {...props} hideCopy />);
    const button = wrapper.find(EuiButtonIcon).dive().find('button');
    button.simulate('click');

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
  });

  it('handles select all button click', () => {
    const wrapper = shallow(<CredentialItem {...props} hideCopy />);
    // Toggle isVisible before EuiFieldText is visible
    const button = wrapper.find(EuiButtonIcon).dive().find('button');
    button.simulate('click');

    const simulatedEvent = {
      button: 0,
      target: { getAttribute: () => '_self' },
      currentTarget: { select: jest.fn() },
      preventDefault: jest.fn(),
    };

    const input = wrapper.find(EuiFieldText).dive().find('input');
    input.simulate('click', simulatedEvent);

    expect(simulatedEvent.currentTarget.select).toHaveBeenCalled();
  });
});
