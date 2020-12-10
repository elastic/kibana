/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from '@kbn/test/jest';

import React from 'react';

import { FieldTitleBar } from './field_title_bar';
import { ML_JOB_FIELD_TYPES } from '../../../../common/constants/field_types';

describe('FieldTitleBar', () => {
  test(`card prop is an empty object`, () => {
    const props = {
      card: {
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        loading: false,
        aggregatable: true,
      },
    };

    const wrapper = mountWithIntl(<FieldTitleBar {...props} />);

    const fieldName = wrapper.find({ className: 'field-name' }).text();
    expect(fieldName).toEqual('document count');

    const hasClassName = wrapper.find('EuiText').hasClass('document_count');
    expect(hasClassName).toBeTruthy();
  });

  test(`card.isUnsupportedType is true`, () => {
    const props = {
      card: {
        type: ML_JOB_FIELD_TYPES.UNKNOWN,
        fieldName: 'foo',
        existsInDocs: true,
        loading: false,
        aggregatable: true,
        isUnsupportedType: true,
      },
    };

    const wrapper = mountWithIntl(<FieldTitleBar {...props} />);

    const fieldName = wrapper.find({ className: 'field-name' }).text();
    expect(fieldName).toEqual(props.card.fieldName);

    const hasClassName = wrapper.find('EuiText').hasClass('type-other');
    expect(hasClassName).toBeTruthy();
  });

  test(`card.fieldName and card.type is set`, () => {
    const props = {
      card: {
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        fieldName: 'bar',
        existsInDocs: true,
        loading: false,
        aggregatable: true,
      },
    };

    const wrapper = mountWithIntl(<FieldTitleBar {...props} />);

    const fieldName = wrapper.find({ className: 'field-name' }).text();
    expect(fieldName).toEqual(props.card.fieldName);

    const hasClassName = wrapper.find('EuiText').hasClass(props.card.type);
    expect(hasClassName).toBeTruthy();
  });

  test(`tooltip hovering`, () => {
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers();

    const props = {
      card: {
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        fieldName: 'bar',
        existsInDocs: true,
        loading: false,
        aggregatable: true,
      },
    };
    const wrapper = mountWithIntl(<FieldTitleBar {...props} />);
    const container = wrapper.find({ className: 'field-name' });

    expect(wrapper.find('EuiToolTip').children()).toHaveLength(2);

    container.simulate('mouseover');

    // Run the timers so the EuiTooltip will be visible
    jest.runAllTimers();

    wrapper.update();
    expect(wrapper.find('EuiToolTip').children()).toHaveLength(3);

    container.simulate('mouseout');

    // Run the timers so the EuiTooltip will be hidden again
    jest.runAllTimers();

    wrapper.update();
    expect(wrapper.find('EuiToolTip').children()).toHaveLength(2);

    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });
});
