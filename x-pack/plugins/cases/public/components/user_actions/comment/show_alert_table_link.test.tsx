/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import React from 'react';
import { createAppMockRenderer } from '../../../common/mock';
import { useCaseViewNavigation, useCaseViewParams } from '../../../common/navigation';
import { ShowAlertTableLink } from './show_alert_table_link';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

const useCaseViewParamsMock = useCaseViewParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('case view alert table link', () => {
  it('calls navigateToCaseView with the correct params', () => {
    const appMockRenderer = createAppMockRenderer();
    const navigateToCaseView = jest.fn();

    useCaseViewParamsMock.mockReturnValue({ detailName: 'case-id' });
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });

    const result = appMockRenderer.render(<ShowAlertTableLink />);
    expect(result.getByTestId('comment-action-show-alerts-case-id')).toBeInTheDocument();

    userEvent.click(result.getByTestId('comment-action-show-alerts-case-id'));
    expect(navigateToCaseView).toHaveBeenCalledWith({
      detailName: 'case-id',
      tabId: 'alerts',
    });
  });
});
