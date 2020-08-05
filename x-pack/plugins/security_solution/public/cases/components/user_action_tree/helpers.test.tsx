/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { basicPush, getUserAction } from '../../containers/mock';
import { getLabelTitle } from './helpers';
import * as i18n from '../case_view/translations';
import { mount } from 'enzyme';
import { connectorsMock } from '../../containers/configure/mock';

describe('User action tree helpers', () => {
  const connectors = connectorsMock;
  it('label title generated for update tags', () => {
    const action = getUserAction(['title'], 'update');
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'tags',
      firstPush: false,
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="ua-tags-label"]`).first().text()).toEqual(
      ` ${i18n.TAGS.toLowerCase()}`
    );

    expect(wrapper.find(`[data-test-subj="ua-tag"]`).first().text()).toEqual(action.newValue);
  });
  it('label title generated for update title', () => {
    const action = getUserAction(['title'], 'update');
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'title',
      firstPush: false,
    });

    expect(result).toEqual(
      `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()}  ${i18n.TO} "${
        action.newValue
      }"`
    );
  });
  it('label title generated for update description', () => {
    const action = getUserAction(['description'], 'update');
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'description',
      firstPush: false,
    });

    expect(result).toEqual(`${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`);
  });
  it('label title generated for update status to open', () => {
    const action = { ...getUserAction(['status'], 'update'), newValue: 'open' };
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'status',
      firstPush: false,
    });

    expect(result).toEqual(`${i18n.REOPENED_CASE.toLowerCase()} ${i18n.CASE}`);
  });
  it('label title generated for update status to closed', () => {
    const action = { ...getUserAction(['status'], 'update'), newValue: 'closed' };
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'status',
      firstPush: false,
    });

    expect(result).toEqual(`${i18n.CLOSED_CASE.toLowerCase()} ${i18n.CASE}`);
  });
  it('label title generated for update comment', () => {
    const action = getUserAction(['comment'], 'update');
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'comment',
      firstPush: false,
    });

    expect(result).toEqual(`${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`);
  });
  it('label title generated for pushed incident', () => {
    const action = getUserAction(['pushed'], 'push-to-service');
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'pushed',
      firstPush: true,
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="pushed-label"]`).first().text()).toEqual(
      `${i18n.PUSHED_NEW_INCIDENT} ${basicPush.connectorName}`
    );
    expect(wrapper.find(`[data-test-subj="pushed-value"]`).first().prop('href')).toEqual(
      JSON.parse(action.newValue).external_url
    );
  });
  it('label title generated for needs update incident', () => {
    const action = getUserAction(['pushed'], 'push-to-service');
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'pushed',
      firstPush: false,
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="pushed-label"]`).first().text()).toEqual(
      `${i18n.UPDATE_INCIDENT} ${basicPush.connectorName}`
    );
    expect(wrapper.find(`[data-test-subj="pushed-value"]`).first().prop('href')).toEqual(
      JSON.parse(action.newValue).external_url
    );
  });
  it('label title generated for update connector', () => {
    const action = getUserAction(['connector_id'], 'update');
    const result: string | JSX.Element = getLabelTitle({
      action,
      connectors,
      field: 'tags',
      firstPush: false,
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="ua-tags-label"]`).first().text()).toEqual(
      ` ${i18n.TAGS.toLowerCase()}`
    );

    expect(wrapper.find(`[data-test-subj="ua-tag"]`).first().text()).toEqual(action.newValue);
  });
});
