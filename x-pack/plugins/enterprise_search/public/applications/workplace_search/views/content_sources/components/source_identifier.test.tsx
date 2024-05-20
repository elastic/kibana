/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCopy, EuiButtonIcon, EuiFieldText } from '@elastic/eui';

import { SourceIdentifier } from './source_identifier';

describe('SourceIdentifier', () => {
  const id = 'foo123';

  it('renders the Source Identifier', () => {
    const wrapper = shallow(<SourceIdentifier id={id} />);

    expect(wrapper.find(EuiFieldText).prop('value')).toEqual(id);
  });

  it('renders the copy button', () => {
    const copyMock = jest.fn();
    const wrapper = shallow(<SourceIdentifier id={id} />);

    const copyEl = shallow(<div>{wrapper.find(EuiCopy).props().children(copyMock)}</div>);
    expect(copyEl.find(EuiButtonIcon).props().onClick).toEqual(copyMock);
  });
});
