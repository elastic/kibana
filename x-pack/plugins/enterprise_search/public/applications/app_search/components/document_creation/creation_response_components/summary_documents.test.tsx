/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiCodeBlock, EuiCallOut } from '@elastic/eui';

import { ExampleDocumentJson, MoreDocumentsText } from './summary_documents';

describe('ExampleDocumentJson', () => {
  const exampleDocument = { hello: 'world' };
  const expectedJson = `{
  "hello": "world"
}`;

  it('renders', () => {
    const wrapper = shallow(<ExampleDocumentJson document={exampleDocument} />);

    expect(wrapper.find(EuiCodeBlock).prop('children')).toEqual(expectedJson);
    expect(wrapper.find(EuiCallOut)).toHaveLength(0);
  });

  it('renders invalid documents with error callouts', () => {
    const wrapper = shallow(
      <ExampleDocumentJson document={exampleDocument} errors={['Bad JSON error', 'Schema error']} />
    );

    expect(wrapper.find('h3').text()).toEqual('This document was not indexed!');
    expect(wrapper.find(EuiCallOut)).toHaveLength(2);
    expect(wrapper.find(EuiCallOut).first().prop('title')).toEqual('Bad JSON error');
    expect(wrapper.find(EuiCallOut).last().prop('title')).toEqual('Schema error');
  });
});

describe('MoreDocumentsText', () => {
  it('renders', () => {
    const wrapper = shallow(<MoreDocumentsText documents={100} />);
    expect(wrapper.find('p').text()).toEqual('and 100 other documents.');

    wrapper.setProps({ documents: 1 });
    expect(wrapper.find('p').text()).toEqual('and 1 other document.');
  });
});
