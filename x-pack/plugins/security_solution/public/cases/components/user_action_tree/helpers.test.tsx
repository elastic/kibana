/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../../../cases/common/api';
import { basicPush, getUserAction } from '../../containers/mock';
import { getLabelTitle, getPushedServiceLabelTitle, getConnectorLabelTitle } from './helpers';
import { connectorsMock } from '../../containers/configure/mock';
import * as i18n from './translations';

describe('User action tree helpers', () => {
  const connectors = connectorsMock;
  it('label title generated for update tags', () => {
    const action = getUserAction(['tags'], 'update');
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'tags',
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="ua-tags-label"]`).first().text()).toEqual(
      ` ${i18n.TAGS.toLowerCase()}`
    );

    expect(wrapper.find(`[data-test-subj="tag-${action.newValue}"]`).first().text()).toEqual(
      action.newValue
    );
  });

  it('label title generated for update title', () => {
    const action = getUserAction(['title'], 'update');
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'title',
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
      field: 'description',
    });

    expect(result).toEqual(`${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`);
  });

  it('label title generated for update status to open', () => {
    const action = { ...getUserAction(['status'], 'update'), newValue: CaseStatuses.open };
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'status',
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="status-badge-open"]`).first().text()).toEqual('Open');
  });

  it('label title generated for update status to in-progress', () => {
    const action = {
      ...getUserAction(['status'], 'update'),
      newValue: CaseStatuses['in-progress'],
    };
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'status',
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="status-badge-in-progress"]`).first().text()).toEqual(
      'In progress'
    );
  });

  it('label title generated for update status to closed', () => {
    const action = { ...getUserAction(['status'], 'update'), newValue: CaseStatuses.closed };
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'status',
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="status-badge-closed"]`).first().text()).toEqual('Closed');
  });

  it('label title is empty when status is not valid', () => {
    const action = { ...getUserAction(['status'], 'update'), newValue: CaseStatuses.closed };
    const result: string | JSX.Element = getLabelTitle({
      action: { ...action, newValue: 'not-exist' },
      field: 'status',
    });

    expect(result).toEqual('');
  });

  it('label title generated for update comment', () => {
    const action = getUserAction(['comment'], 'update');
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'comment',
    });

    expect(result).toEqual(`${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`);
  });

  it('label title generated for pushed incident', () => {
    const action = getUserAction(['pushed'], 'push-to-service');
    const result: string | JSX.Element = getPushedServiceLabelTitle(action, true);

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
    const result: string | JSX.Element = getPushedServiceLabelTitle(action, false);

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="pushed-label"]`).first().text()).toEqual(
      `${i18n.UPDATE_INCIDENT} ${basicPush.connectorName}`
    );
    expect(wrapper.find(`[data-test-subj="pushed-value"]`).first().prop('href')).toEqual(
      JSON.parse(action.newValue).external_url
    );
  });

  it('label title generated for update connector - change connector', () => {
    const action = {
      ...getUserAction(['connector'], 'update'),
      oldValue: JSON.stringify({ id: 'servicenow-1' }),
      newValue: JSON.stringify({ id: 'resilient-2' }),
    };
    const result: string | JSX.Element = getConnectorLabelTitle({
      action,
      connectors,
    });

    expect(result).toEqual('selected My Connector 2 as incident management system');
  });

  it('label title generated for update connector - change connector to none', () => {
    const action = {
      ...getUserAction(['connector'], 'update'),
      oldValue: JSON.stringify({ id: 'servicenow-1' }),
      newValue: JSON.stringify({ id: 'none' }),
    };
    const result: string | JSX.Element = getConnectorLabelTitle({
      action,
      connectors,
    });

    expect(result).toEqual('removed external incident management system');
  });

  it('label title generated for update connector - field change', () => {
    const action = {
      ...getUserAction(['connector'], 'update'),
      oldValue: JSON.stringify({ id: 'servicenow-1' }),
      newValue: JSON.stringify({ id: 'servicenow-1' }),
    };
    const result: string | JSX.Element = getConnectorLabelTitle({
      action,
      connectors,
    });

    expect(result).toEqual('changed connector field');
  });
});
