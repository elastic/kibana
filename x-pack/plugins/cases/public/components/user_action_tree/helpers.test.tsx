/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses, ConnectorTypes } from '../../../common/api';
import { basicPush, getUserAction } from '../../containers/mock';
import {
  getLabelTitle,
  getPushedServiceLabelTitle,
  getConnectorLabelTitle,
  toStringArray,
} from './helpers';
import { connectorsMock } from '../../containers/configure/mock';
import * as i18n from './translations';
import { TagsUserAction } from '../../../common/api/cases/user_actions/tags';
import { TitleUserAction } from '../../../common/api/cases/user_actions/title';
import { PushedUserAction } from '../../../common/api/cases/user_actions/pushed';
import { ConnectorUserAction } from '../../../common/api/cases/user_actions/connector';
import { SnakeToCamelCase } from '../../../common/types';

describe('User action tree helpers', () => {
  const connectors = connectorsMock;
  it('label title generated for update tags', () => {
    const action = getUserAction(['tags'], 'update', { payload: { tags: ['test'] } });
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'tags',
    });

    const tags = (action as TagsUserAction).payload.tags;

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="ua-tags-label"]`).first().text()).toEqual(
      ` ${i18n.TAGS.toLowerCase()}`
    );

    expect(wrapper.find(`[data-test-subj="tag-${tags[0]}"]`).first().text()).toEqual(tags[0]);
  });

  it('label title generated for update title', () => {
    const action = getUserAction(['title'], 'update', { payload: { title: 'test' } });
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'title',
    });

    const title = (action as TitleUserAction).payload.title;

    expect(result).toEqual(
      `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()}  ${i18n.TO} "${title}"`
    );
  });

  it('label title generated for update description', () => {
    const action = getUserAction(['description'], 'update', { payload: { description: 'test' } });
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'description',
    });

    expect(result).toEqual(`${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`);
  });

  it('label title generated for update status to open', () => {
    const action = {
      ...getUserAction(['status'], 'update', { payload: { status: CaseStatuses.open } }),
    };
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'status',
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="status-badge-open"]`).first().text()).toEqual('Open');
  });

  it('label title generated for update status to in-progress', () => {
    const action = {
      ...getUserAction(['status'], 'update', { payload: { status: CaseStatuses['in-progress'] } }),
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
    const action = {
      ...getUserAction(['status'], 'update', {
        payload: { status: CaseStatuses.closed },
      }),
    };
    const result: string | JSX.Element = getLabelTitle({
      action,
      field: 'status',
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="status-badge-closed"]`).first().text()).toEqual('Closed');
  });

  it('label title is empty when status is not valid', () => {
    const action = {
      ...getUserAction(['status'], 'update', {
        payload: { status: '' },
      }),
    };

    const result: string | JSX.Element = getLabelTitle({
      action,
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
    const action = getUserAction(['pushed'], 'push_to_service', {
      payload: { externalService: basicPush },
    }) as SnakeToCamelCase<PushedUserAction>;
    const result: string | JSX.Element = getPushedServiceLabelTitle(action, true);
    const externalService = (action as SnakeToCamelCase<PushedUserAction>).payload.externalService;

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="pushed-label"]`).first().text()).toEqual(
      `${i18n.PUSHED_NEW_INCIDENT} ${basicPush.connectorName}`
    );
    expect(wrapper.find(`[data-test-subj="pushed-value"]`).first().prop('href')).toEqual(
      externalService.externalUrl
    );
  });

  it('label title generated for needs update incident', () => {
    const action = getUserAction(
      ['pushed'],
      'push_to_service'
    ) as SnakeToCamelCase<PushedUserAction>;
    const result: string | JSX.Element = getPushedServiceLabelTitle(action, false);
    const externalService = (action as SnakeToCamelCase<PushedUserAction>).payload.externalService;

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="pushed-label"]`).first().text()).toEqual(
      `${i18n.UPDATE_INCIDENT} ${basicPush.connectorName}`
    );
    expect(wrapper.find(`[data-test-subj="pushed-value"]`).first().prop('href')).toEqual(
      externalService.externalUrl
    );
  });

  describe('getConnectorLabelTitle', () => {
    it('returns an empty string when the encoded value is null', () => {
      const result = getConnectorLabelTitle({
        // @ts-expect-error
        action: getUserAction(['connector'], 'update', { payload: { connector: null } }),
        connectors,
      });

      expect(result).toEqual('');
    });

    it('returns the change connector label', () => {
      const result: string | JSX.Element = getConnectorLabelTitle({
        action: getUserAction(['connector'], 'update', {
          payload: {
            connector: { id: '123', type: ConnectorTypes.resilient, name: 'a', fields: null },
          },
        }) as ConnectorUserAction,
        connectors,
      });

      expect(result).toEqual('selected My Connector 2 as incident management system');
    });

    it('returns the removed connector label', () => {
      const result: string | JSX.Element = getConnectorLabelTitle({
        action: getUserAction(['connector'], 'update', {
          payload: {
            connector: { id: 'none', type: ConnectorTypes.none, name: 'test', fields: null },
          },
        }) as ConnectorUserAction,
        connectors,
      });

      expect(result).toEqual('removed external incident management system');
    });
  });

  describe('toStringArray', () => {
    const circularReference = { otherData: 123, circularReference: undefined };
    // @ts-ignore testing catch on circular reference
    circularReference.circularReference = circularReference;
    it('handles all data types in an array', () => {
      const value = [1, true, { a: 1 }, circularReference, 'yeah', 100n, null];
      const res = toStringArray(value);
      expect(res).toEqual(['1', 'true', '{"a":1}', 'Invalid Object', 'yeah', '100']);
    });
    it('handles null', () => {
      const value = null;
      const res = toStringArray(value);
      expect(res).toEqual([]);
    });

    it('handles object', () => {
      const value = { a: true };
      const res = toStringArray(value);
      expect(res).toEqual([JSON.stringify(value)]);
    });

    it('handles Invalid Object', () => {
      const value = circularReference;
      const res = toStringArray(value);
      expect(res).toEqual(['Invalid Object']);
    });

    it('handles unexpected value', () => {
      const value = 100n;
      const res = toStringArray(value);
      expect(res).toEqual(['100']);
    });
  });
});
