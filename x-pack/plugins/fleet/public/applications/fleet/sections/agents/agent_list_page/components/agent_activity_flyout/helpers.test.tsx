/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FormattedMessage } from '@kbn/i18n-react';

import { getAction, inProgressDescription } from './helpers';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: jest.fn(({ id, defaultMessage, values }) => <span>{defaultMessage}</span>),
}));

describe('Action Utilities', () => {
  describe('getAction', () => {
    it('should return the default action when type is undefined', () => {
      expect(getAction(undefined)).toEqual({
        inProgressText: (
          <FormattedMessage
            id="xpack.fleet.agentActivity.action.inProgress"
            defaultMessage="Actioning"
          />
        ),
        completedText: (
          <FormattedMessage
            id="xpack.fleet.agentActivity.action.completed"
            defaultMessage="actioned"
          />
        ),
        cancelledText: (
          <FormattedMessage
            id="xpack.fleet.agentActivity.action.cancelled"
            defaultMessage="action"
          />
        ),
      });
    });

    it('should return the correct action for a given type', () => {
      expect(getAction('UPGRADE')).toEqual({
        inProgressText: (
          <FormattedMessage
            id="xpack.fleet.agentActivity.upgrade.inProgress"
            defaultMessage="Upgrading"
          />
        ),
        completedText: (
          <FormattedMessage
            id="xpack.fleet.agentActivity.upgrade.completed"
            defaultMessage="upgraded"
          />
        ),
        cancelledText: (
          <FormattedMessage
            id="xpack.fleet.agentActivity.upgrade.cancelled"
            defaultMessage="upgrade"
          />
        ),
      });
    });
  });

  describe('inProgressDescription', () => {
    it('should render the inProgressDescription with correct formatted time', () => {
      const { container } = render(inProgressDescription('2023-06-01T12:00:00Z'));
      expect(container.textContent).toContain('Started on');
    });
  });
});
