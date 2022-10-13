/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import '../../../../__mocks__/shallow_useeffect.mock';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { SchemaAddFieldModal } from '../../../../shared/schema';
import { getPageHeaderActions, getPageTitle, getPageDescription } from '../../../../test_helpers';

import { SchemaCallouts, SchemaTable } from '../components';

import { Schema } from '.';

describe('Schema', () => {
  const values = {
    dataLoading: false,
    hasSchema: true,
    hasSchemaChanged: false,
    isUpdating: false,
    isModalOpen: false,
    myRole: { canManageEngines: true },
  };
  const actions = {
    loadSchema: jest.fn(),
    updateSchema: jest.fn(),
    addSchemaField: jest.fn(),
    openModal: jest.fn(),
    closeModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(SchemaCallouts)).toHaveLength(1);
    expect(wrapper.find(SchemaTable)).toHaveLength(1);
  });

  it('calls loadSchema on mount', () => {
    shallow(<Schema />);

    expect(actions.loadSchema).toHaveBeenCalled();
  });

  describe('page action buttons', () => {
    const subject = () => getPageHeaderActions(shallow(<Schema />));

    it('renders buttons when access allows', () => {
      const wrapper = subject();

      expect(wrapper.find(EuiButton)).toHaveLength(2);
    });

    it('does not render buttons when access disallowed', () => {
      setMockValues({ ...values, myRole: { canManageEngines: false } });
      const wrapper = subject();

      expect(wrapper.find(EuiButton)).toHaveLength(0);
    });

    it('renders loading/disabled state when schema is updating', () => {
      setMockValues({ ...values, isUpdating: true });
      const wrapper = subject();

      expect(wrapper.find('[data-test-subj="updateSchemaButton"]').prop('isLoading')).toBe(true);
      expect(wrapper.find('[data-test-subj="addSchemaFieldModalButton"]').prop('disabled')).toBe(
        true
      );
    });

    describe('add button', () => {
      it('opens the add schema field modal', () => {
        const wrapper = subject();

        wrapper.find('[data-test-subj="addSchemaFieldModalButton"]').simulate('click');
        expect(actions.openModal).toHaveBeenCalled();
      });
    });

    describe('update button', () => {
      describe('when nothing on the page has changed', () => {
        it('is disabled', () => {
          const wrapper = subject();

          expect(wrapper.find('[data-test-subj="updateSchemaButton"]').prop('disabled')).toBe(true);
        });
      });

      describe('when schema has been changed locally', () => {
        it('is enabled', () => {
          setMockValues({ ...values, hasSchemaChanged: true });
          const wrapper = subject();

          expect(wrapper.find('[data-test-subj="updateSchemaButton"]').prop('disabled')).toBe(
            false
          );
        });

        it('calls updateSchema on click', () => {
          setMockValues({ ...values, hasSchemaChanged: true });
          const wrapper = subject();

          wrapper.find('[data-test-subj="updateSchemaButton"]').simulate('click');
          expect(actions.updateSchema).toHaveBeenCalled();
        });
      });
    });
  });

  it('renders a modal that lets a user add a new schema field', () => {
    setMockValues({ ...values, isModalOpen: true });
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(SchemaAddFieldModal)).toHaveLength(1);
  });

  it('renders a read-only header for elasticsearch engines', () => {
    setMockValues({ ...values, isElasticsearchEngine: true });
    const title = getPageTitle(shallow(<Schema />));
    const description = getPageDescription(shallow(<Schema />));

    expect(title).toBe('Engine schema');
    expect(description).toBe('View schema field types.');
  });
});
