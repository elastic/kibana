/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiCopy, EuiButtonIcon, EuiFieldText } from '@elastic/eui';

import { CredentialItem } from './';

const label = 'Credential';
const testSubj = 'CredentialItemTest';
const value = 'foo';

let wrapper: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>;
const props = { label, testSubj, value };

describe('CredentialItem', () => {
  const setState = jest.fn();
  const useStateMock: any = (initState: any) => [initState, setState];

  beforeEach(() => {
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);
    setState(false);

    wrapper = shallow(<CredentialItem {...props} />);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    expect(wrapper.find(`[data-test-subj="${testSubj}"]`)).toHaveLength(1);
  });

  it('renders the copy button', () => {
    const copyMock = jest.fn();
    const copyEl = shallow(<div>{wrapper.find(EuiCopy).props().children(copyMock)}</div>);
    expect(copyEl.find(EuiButtonIcon).props().onClick).toEqual(copyMock);
  });

  it('does not render copy button when hidden', () => {
    wrapper.setProps({ ...props, hideCopy: true });

    expect(wrapper.find(EuiCopy)).toHaveLength(0);
  });

  it('handles credential visible toggle click', () => {
    wrapper.setProps({ ...props, hideCopy: true });
    const button = wrapper.find(EuiButtonIcon).dive().find('button');
    button.simulate('click');

    expect(setState).toHaveBeenCalled();
    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
  });

  it('handles select all button click', () => {
    wrapper.setProps({ ...props, hideCopy: true });
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
