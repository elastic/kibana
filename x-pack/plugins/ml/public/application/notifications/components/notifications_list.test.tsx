/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, waitFor } from '@testing-library/react';
import { NotificationsList } from './notifications_list';
import { useMlKibana } from '../../contexts/kibana';

jest.mock('../../contexts/kibana');
jest.mock('../../services/toast_notification_service');
jest.mock('../../contexts/ml/ml_notifications_context');
jest.mock('../../contexts/kibana/use_timefilter');
jest.mock('../../contexts/kibana/use_field_formatter');
jest.mock('../../components/saved_objects_warning');

describe('NotificationsList', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('starts fetching notification on mount with default params', async () => {
    const {} = render(<NotificationsList />, { wrapper: I18nProvider });

    jest.advanceTimersByTime(500);

    await waitFor(() => {
      expect(
        useMlKibana().services.mlServices.mlApiServices.notifications.findMessages
      ).toHaveBeenCalledTimes(1);
      expect(
        useMlKibana().services.mlServices.mlApiServices.notifications.findMessages
      ).toHaveBeenCalledWith({
        earliest: '',
        latest: '',
        queryString: '*',
        sortDirection: 'desc',
        sortField: 'timestamp',
      });
    });
  });
});
