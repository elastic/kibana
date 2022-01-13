/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import {
  Actions,
  CaseStatuses,
  CommentType,
  ConnectorTypes,
  ConnectorUserAction,
  PushedUserAction,
  TagsUserAction,
  TitleUserAction,
} from '../../../common/api';
import { basicPush, getUserAction } from '../../containers/mock';
import { getLabelTitle, getPushedServiceLabelTitle, getConnectorLabelTitle } from './helpers';
import { connectorsMock } from '../../containers/configure/mock';
import * as i18n from './translations';
import { SnakeToCamelCase } from '../../../common/types';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';

describe('User action tree helpers', () => {
  const connectors = connectorsMock;
  it('label title generated for update tags', () => {
    const action = getUserAction('tags', Actions.update, { payload: { tags: ['test'] } });
    const result: string | JSX.Element = getLabelTitle({
      action,
    });

    const tags = (action as unknown as TagsUserAction).payload.tags;

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="ua-tags-label"]`).first().text()).toEqual(
      ` ${i18n.TAGS.toLowerCase()}`
    );

    expect(wrapper.find(`[data-test-subj="tag-${tags[0]}"]`).first().text()).toEqual(tags[0]);
  });

  it('label title generated for update title', () => {
    const action = getUserAction('title', Actions.update, { payload: { title: 'test' } });
    const result: string | JSX.Element = getLabelTitle({
      action,
    });

    const title = (action as unknown as TitleUserAction).payload.title;

    expect(result).toEqual(
      `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()}  ${i18n.TO} "${title}"`
    );
  });

  it('label title generated for update description', () => {
    const action = getUserAction('description', Actions.update, {
      payload: { description: 'test' },
    });
    const result: string | JSX.Element = getLabelTitle({
      action,
    });

    expect(result).toEqual(`${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`);
  });

  it('label title generated for update status to open', () => {
    const action = {
      ...getUserAction('status', Actions.update, { payload: { status: CaseStatuses.open } }),
    };
    const result: string | JSX.Element = getLabelTitle({
      action,
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="status-badge-open"]`).first().text()).toEqual('Open');
  });

  it('label title generated for update status to in-progress', () => {
    const action = {
      ...getUserAction('status', Actions.update, {
        payload: { status: CaseStatuses['in-progress'] },
      }),
    };
    const result: string | JSX.Element = getLabelTitle({
      action,
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="status-badge-in-progress"]`).first().text()).toEqual(
      'In progress'
    );
  });

  it('label title generated for update status to closed', () => {
    const action = {
      ...getUserAction('status', Actions.update, {
        payload: { status: CaseStatuses.closed },
      }),
    };
    const result: string | JSX.Element = getLabelTitle({
      action,
    });

    const wrapper = mount(<>{result}</>);
    expect(wrapper.find(`[data-test-subj="status-badge-closed"]`).first().text()).toEqual('Closed');
  });

  it('label title is empty when status is not valid', () => {
    const action = {
      ...getUserAction('status', Actions.update, {
        payload: { status: '' },
      }),
    };

    const result: string | JSX.Element = getLabelTitle({
      action,
    });

    expect(result).toEqual('');
  });

  it('label title generated for update comment', () => {
    const action = getUserAction('comment', Actions.update, {
      payload: {
        comment: { comment: 'a comment', type: CommentType.user, owner: SECURITY_SOLUTION_OWNER },
      },
    });
    const result: string | JSX.Element = getLabelTitle({
      action,
    });

    expect(result).toEqual(`${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`);
  });

  it('label title generated for pushed incident', () => {
    const action = getUserAction('pushed', 'push_to_service', {
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
    const action = getUserAction('pushed', 'push_to_service') as SnakeToCamelCase<PushedUserAction>;
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
        action: getUserAction(['connector'], Actions.update, { payload: { connector: null } }),
        connectors,
      });

      expect(result).toEqual('');
    });

    it('returns the change connector label', () => {
      const result: string | JSX.Element = getConnectorLabelTitle({
        action: getUserAction('connector', Actions.update, {
          payload: {
            connector: {
              id: 'resilient-2',
              type: ConnectorTypes.resilient,
              name: 'a',
              fields: null,
            },
          },
        }) as unknown as ConnectorUserAction,
        connectors,
      });

      expect(result).toEqual('selected My Connector 2 as incident management system');
    });

    it('returns the removed connector label', () => {
      const result: string | JSX.Element = getConnectorLabelTitle({
        action: getUserAction('connector', Actions.update, {
          payload: {
            connector: { id: 'none', type: ConnectorTypes.none, name: 'test', fields: null },
          },
        }) as unknown as ConnectorUserAction,
        connectors,
      });

      expect(result).toEqual('removed external incident management system');
    });
  });
});
