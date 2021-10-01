/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge } from '@elastic/eui';

import { ExampleDocumentJson, MoreDocumentsText } from './summary_documents';
import { SummarySectionAccordion, SummarySectionEmpty } from './summary_section';

import {
  InvalidDocumentsSummary,
  ValidDocumentsSummary,
  SchemaFieldsSummary,
} from './summary_sections';

describe('InvalidDocumentsSummary', () => {
  const mockDocument = { hello: 'world' };
  const mockExample = { document: mockDocument, errors: ['bad schema'] };

  it('renders', () => {
    setMockValues({
      summary: {
        invalidDocuments: {
          total: 1,
          examples: [mockExample],
        },
      },
    });
    const wrapper = shallow(<InvalidDocumentsSummary />);

    expect(wrapper.find(SummarySectionAccordion).prop('title')).toEqual(
      '1 document with errors...'
    );
    expect(wrapper.find(ExampleDocumentJson)).toHaveLength(1);
    expect(wrapper.find(MoreDocumentsText)).toHaveLength(0);
  });

  it('renders with MoreDocumentsText if more than 5 documents exist', () => {
    setMockValues({
      summary: {
        invalidDocuments: {
          total: 100,
          examples: [mockExample, mockExample, mockExample, mockExample, mockExample],
        },
      },
    });
    const wrapper = shallow(<InvalidDocumentsSummary />);

    expect(wrapper.find(SummarySectionAccordion).prop('title')).toEqual(
      '100 documents with errors...'
    );
    expect(wrapper.find(ExampleDocumentJson)).toHaveLength(5);
    expect(wrapper.find(MoreDocumentsText)).toHaveLength(1);
    expect(wrapper.find(MoreDocumentsText).prop('documents')).toEqual(95);
  });

  it('does not render if there are no invalid documents', () => {
    setMockValues({
      summary: {
        invalidDocuments: {
          total: 0,
          examples: [],
        },
      },
    });
    const wrapper = shallow(<InvalidDocumentsSummary />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});

describe('ValidDocumentsSummary', () => {
  const mockDocument = { hello: 'world' };

  it('renders', () => {
    setMockValues({
      summary: {
        validDocuments: {
          total: 1,
          examples: [mockDocument],
        },
      },
    });
    const wrapper = shallow(<ValidDocumentsSummary />);

    expect(wrapper.find(SummarySectionAccordion).prop('title')).toEqual('Added 1 document.');
    expect(wrapper.find(ExampleDocumentJson)).toHaveLength(1);
    expect(wrapper.find(MoreDocumentsText)).toHaveLength(0);
  });

  it('renders with MoreDocumentsText if more than 5 documents exist', () => {
    setMockValues({
      summary: {
        validDocuments: {
          total: 7,
          examples: [mockDocument, mockDocument, mockDocument, mockDocument, mockDocument],
        },
      },
    });
    const wrapper = shallow(<ValidDocumentsSummary />);

    expect(wrapper.find(SummarySectionAccordion).prop('title')).toEqual('Added 7 documents.');
    expect(wrapper.find(ExampleDocumentJson)).toHaveLength(5);
    expect(wrapper.find(MoreDocumentsText)).toHaveLength(1);
    expect(wrapper.find(MoreDocumentsText).prop('documents')).toEqual(2);
  });

  it('renders SummarySectionEmpty if there are no valid documents', () => {
    setMockValues({
      summary: {
        validDocuments: {
          total: 0,
          examples: [],
        },
      },
    });
    const wrapper = shallow(<ValidDocumentsSummary />);

    expect(wrapper.find(SummarySectionEmpty).prop('title')).toEqual('No new documents.');
  });
});

describe('SchemaFieldsSummary', () => {
  it('renders', () => {
    setMockValues({
      summary: {
        newSchemaFields: ['test'],
      },
    });
    const wrapper = shallow(<SchemaFieldsSummary />);

    expect(wrapper.find(SummarySectionAccordion).prop('title')).toEqual(
      "Added 1 field to the Engine's schema."
    );
    expect(wrapper.find(EuiBadge)).toHaveLength(1);
  });

  it('renders multiple new schema fields', () => {
    setMockValues({
      summary: {
        newSchemaFields: ['foo', 'bar', 'baz', 'qux', 'quux', 'quuz'],
      },
    });
    const wrapper = shallow(<SchemaFieldsSummary />);

    expect(wrapper.find(SummarySectionAccordion).prop('title')).toEqual(
      "Added 6 fields to the Engine's schema."
    );
    expect(wrapper.find(EuiBadge)).toHaveLength(6);
  });

  it('renders SummarySectionEmpty if there are no new schema fields', () => {
    setMockValues({
      summary: {
        newSchemaFields: [],
      },
    });
    const wrapper = shallow(<SchemaFieldsSummary />);

    expect(wrapper.find(SummarySectionEmpty).prop('title')).toEqual('No new schema fields.');
  });
});
