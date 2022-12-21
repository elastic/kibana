/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { SchemaErrorsCallout } from '../../../../shared/schema';

import {
  UnsearchedFieldsCallout,
  UnconfirmedFieldsCallout,
  ConfirmSchemaButton,
} from './schema_callouts';

import { SchemaCallouts } from '.';

describe('SchemaCallouts', () => {
  const values = {
    hasUnconfirmedFields: false,
    hasNewUnsearchedFields: false,
    mostRecentIndexJob: {
      hasErrors: false,
      activeReindexJobId: 'some-id',
    },
    myRole: { canManageEngines: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders nothing if there is nothing to call out', () => {
    const wrapper = shallow(<SchemaCallouts />);

    expect(wrapper.text()).toBeFalsy();
  });

  it('renders a schema errors callout if the most recent index job had errors', () => {
    setMockValues({
      ...values,
      mostRecentIndexJob: {
        hasErrors: true,
        activeReindexJobId: '12345',
      },
    });
    const wrapper = shallow(<SchemaCallouts />);

    expect(wrapper.find(SchemaErrorsCallout)).toHaveLength(1);
    expect(wrapper.find(SchemaErrorsCallout).prop('viewErrorsPath')).toEqual(
      '/engines/some-engine/schema/reindex_job/12345'
    );
  });

  it('renders an unsearched fields callout if the schema has new unconfirmed & unsearched fields', () => {
    setMockValues({
      ...values,
      hasUnconfirmedFields: true,
      hasNewUnsearchedFields: true,
    });
    const wrapper = shallow(<SchemaCallouts />);

    expect(wrapper.find(UnsearchedFieldsCallout)).toHaveLength(1);
  });

  it('renders an unconfirmed fields callout if the schema has unconfirmed fields', () => {
    setMockValues({
      ...values,
      hasUnconfirmedFields: true,
    });
    const wrapper = shallow(<SchemaCallouts />);

    expect(wrapper.find(UnconfirmedFieldsCallout)).toHaveLength(1);
  });

  describe('non-owner/admins', () => {
    it('does not render an unsearched fields callout if user does not have access', () => {
      setMockValues({
        ...values,
        hasUnconfirmedFields: true,
        hasNewUnsearchedFields: true,
        myRole: { canManageEngines: false },
      });
      const wrapper = shallow(<SchemaCallouts />);

      expect(wrapper.find(UnsearchedFieldsCallout)).toHaveLength(0);
    });

    it('does not render an unconfirmed fields callout if user does not have access', () => {
      setMockValues({
        ...values,
        hasUnconfirmedFields: true,
        myRole: { canManageEngines: false },
      });
      const wrapper = shallow(<SchemaCallouts />);

      expect(wrapper.find(UnconfirmedFieldsCallout)).toHaveLength(0);
    });
  });

  describe('UnsearchedFieldsCallout', () => {
    it('renders an info callout about unsearched fields with a link to the relevance tuning page', () => {
      const wrapper = shallow(<UnsearchedFieldsCallout />);

      expect(wrapper.prop('title')).toEqual(
        'Recently added fields are not being searched by default'
      );
      expect(wrapper.find('[data-test-subj="relevanceTuningButtonLink"]').prop('to')).toEqual(
        '/engines/some-engine/relevance_tuning'
      );
    });
  });

  describe('UnconfirmedFieldsCallout', () => {
    it('renders an info callout about unconfirmed fields', () => {
      const wrapper = shallow(<UnconfirmedFieldsCallout />);

      expect(wrapper.prop('title')).toEqual("You've recently added new schema fields");
    });
  });

  describe('ConfirmSchemaButton', () => {
    const actions = { updateSchema: jest.fn() };

    beforeEach(() => {
      setMockValues({ isUpdating: false });
      setMockActions(actions);
    });

    it('allows users to confirm schema without changes from the callouts', () => {
      const wrapper = shallow(<ConfirmSchemaButton />);

      wrapper.simulate('click');
      expect(actions.updateSchema).toHaveBeenCalled();
    });
  });
});
