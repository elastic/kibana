/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import TheHiveParamsFields from './params';
import { SUB_ACTION } from '../../../common/thehive/constants';
import { ExecutorParams, ExecutorSubActionPushParams, ExecutorSubActionCreateAlertParams } from '../../../common/thehive/types';
import { mountWithIntl } from '@kbn/test-jest-helpers';

describe('SubAction: pushToService', () => {
  describe('TheHiveParamsFields renders', () => {
    const subActionParams: ExecutorSubActionPushParams = {
      incident: {
        title: 'title {test}',
        description: 'test description',
        tlp: 2,
        severity: 2,
        tags: ["test1"],
        externalId: null
      },
      comments: [],
    };
    const actionParams: ExecutorParams = {
      subAction: SUB_ACTION.PUSH_TO_SERVICE,
      subActionParams
    };
    const connector: ActionConnector = {
      secrets: {},
      config: {},
      id: 'test',
      actionTypeId: '.test',
      name: 'Test',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false as const,
    };

    const editAction = jest.fn();
    const defaultProps = {
      actionConnector: connector,
      actionParams,
      editAction,
      errors: { 'subActionParams.incident.title': [] },
      index: 0,
      messageVariables: [],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('all Params fields is rendered', () => {
      const wrapper = mountWithIntl(<TheHiveParamsFields {...defaultProps} />);

      expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="title-row"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="description-row"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="eventTags"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="eventSeveritySelect"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="eventTlpSelect"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="comment"]').length > 0).toBeTruthy();

      expect(wrapper.find('[data-test-subj="eventActionSelect"]').first().prop('value')).toStrictEqual(SUB_ACTION.PUSH_TO_SERVICE);
      expect(wrapper.find('[data-test-subj="eventSeveritySelect"]').first().prop('value')).toStrictEqual(2);
      expect(wrapper.find('[data-test-subj="eventTlpSelect"]').first().prop('value')).toStrictEqual(2);

    });

    it('calls editAction function with the correct arguments', () => {
      const { getByTestId } = render(<TheHiveParamsFields {...defaultProps} />);
      const eventActionEl = getByTestId('eventActionSelect');

      fireEvent.change(eventActionEl, { target: { value: SUB_ACTION.PUSH_TO_SERVICE } });
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        {
          incident: {
            tlp: 2,
            severity: 2,
            tags: [],
          },
          comments: [],
        },
        0
      );
    });

    it('handles the case when subAction is undefined', () => {
      const newProps = {
        ...defaultProps,
        actionParams: {
          ...actionParams,
          subAction: undefined,
        },
      };
      render(
        <TheHiveParamsFields {...newProps} />
      );
      expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.PUSH_TO_SERVICE, 0);
    });
  })
});

describe('SubAction: createAlert', () => {
  describe('TheHiveParamsFields renders', () => {
    const subActionParams: ExecutorSubActionCreateAlertParams = {
      title: 'title {test}',
      description: 'description test',
      tlp: 2,
      severity: 2,
      tags: ["test1"],
      source: 'source test',
      type: 'sourceType test',
      sourceRef: 'sourceRef test'
    }
    const actionParams: ExecutorParams = {
      subAction: SUB_ACTION.CREATE_ALERT,
      subActionParams
    };
    const connector: ActionConnector = {
      secrets: {},
      config: {},
      id: 'test',
      actionTypeId: '.test',
      name: 'Test',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false as const,
    };

    const editAction = jest.fn();
    const defaultProps = {
      actionConnector: connector,
      actionParams,
      editAction,
      errors: { 'subActionParams.incident.title': [] },
      index: 0,
      messageVariables: [],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('all Params fields is rendered', () => {
      const wrapper = mountWithIntl(<TheHiveParamsFields {...defaultProps} />);

      expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="alert-title-row"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="alert-description-row"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="alert-eventTags"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="alert-eventSeveritySelect"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="alert-eventTlpSelect"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="alert-type-row"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="alert-source-row"]').length > 0).toBeTruthy();
      expect(wrapper.find('[data-test-subj="alert-sourceRef-row"]').length > 0).toBeTruthy();

      expect(wrapper.find('[data-test-subj="eventActionSelect"]').first().prop('value')).toStrictEqual(SUB_ACTION.CREATE_ALERT);
      expect(wrapper.find('[data-test-subj="alert-eventSeveritySelect"]').first().prop('value')).toStrictEqual(2);
      expect(wrapper.find('[data-test-subj="alert-eventTlpSelect"]').first().prop('value')).toStrictEqual(2);
    });

    it('calls editAction function with the correct arguments', () => {
      const { getByTestId } = render(<TheHiveParamsFields {...defaultProps} />);
      const eventActionEl = getByTestId('eventActionSelect');

      fireEvent.change(eventActionEl, { target: { value: SUB_ACTION.CREATE_ALERT } });
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        {
          tlp: 2,
          severity: 2,
          tags: [],
        },
        0
      );
    });

  })
});
