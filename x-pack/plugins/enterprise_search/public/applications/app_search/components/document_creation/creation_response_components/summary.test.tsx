/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyoutBody, EuiCallOut, EuiButton } from '@elastic/eui';

import { FlyoutHeader, FlyoutBody, FlyoutFooter } from './summary';
import {
  InvalidDocumentsSummary,
  ValidDocumentsSummary,
  SchemaFieldsSummary,
} from './summary_sections';

import { Summary } from '.';

describe('Summary', () => {
  const values = {
    summary: {
      invalidDocuments: {
        total: 0,
      },
    },
  };
  const actions = {
    setCreationStep: jest.fn(),
    closeDocumentCreation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<Summary />);
    expect(wrapper.find(FlyoutHeader)).toHaveLength(1);
    expect(wrapper.find(FlyoutBody)).toHaveLength(1);
    expect(wrapper.find(FlyoutFooter)).toHaveLength(1);
  });

  describe('FlyoutHeader', () => {
    it('renders', () => {
      const wrapper = shallow(<FlyoutHeader />);
      expect(wrapper.find('h2').text()).toEqual('Indexing summary');
    });
  });

  describe('FlyoutBody', () => {
    it('renders', () => {
      const wrapper = shallow(<FlyoutBody />);
      expect(wrapper.find(InvalidDocumentsSummary)).toHaveLength(1);
      expect(wrapper.find(ValidDocumentsSummary)).toHaveLength(1);
      expect(wrapper.find(SchemaFieldsSummary)).toHaveLength(1);
    });

    it('shows an error callout as a flyout banner when the upload contained invalid document(s)', () => {
      setMockValues({ summary: { invalidDocuments: { total: 1 } } });
      const wrapper = shallow(<FlyoutBody />);
      const banner = wrapper.find(EuiFlyoutBody).prop('banner') as any;

      expect(banner.type).toEqual(EuiCallOut);
      expect(banner.props.color).toEqual('danger');
      expect(banner.props.iconType).toEqual('alert');
      expect(banner.props.title).toEqual(
        'Something went wrong. Please address the errors and try again.'
      );
    });
  });

  describe('FlyoutFooter', () => {
    it('closes the flyout', () => {
      const wrapper = shallow(<FlyoutFooter />);

      wrapper.find(EuiButton).simulate('click');
      expect(actions.closeDocumentCreation).toHaveBeenCalled();
    });

    it('shows a "Fix errors" button when the upload contained invalid document(s)', () => {
      setMockValues({ summary: { invalidDocuments: { total: 5 } } });
      const wrapper = shallow(<FlyoutFooter />);

      wrapper.find(EuiButton).last().simulate('click');
      expect(actions.setCreationStep).toHaveBeenCalledWith(1);
    });
  });
});
