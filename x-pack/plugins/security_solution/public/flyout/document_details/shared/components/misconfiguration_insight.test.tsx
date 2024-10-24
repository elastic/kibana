/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { MisconfigurationsInsight } from './misconfiguration_insight';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { DocumentDetailsContext } from '../context';
import { mockFlyoutApi } from '../mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { mockContextValue } from '../mocks/mock_context';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from '../../right/components/host_entity_overview';
import { UserPreviewPanelKey } from '../../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from '../../right/components/user_entity_overview';

jest.mock('@kbn/expandable-flyout');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');

const hostName = 'test host';
const userName = 'test user';
const testId = 'test';

const renderMisconfigurationsInsight = (fieldName: 'host.name' | 'user.name', value: string) => {
  return render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <MisconfigurationsInsight name={value} fieldName={fieldName} data-test-subj={testId} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );
};

describe('MisconfigurationsInsight', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('renders', () => {
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({
      data: { count: { passed: 1, failed: 2 } },
    });
    const { getByTestId } = renderMisconfigurationsInsight('host.name', hostName);
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
  });

  it('renders null if no misconfiguration data found', () => {
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({});
    const { container } = renderMisconfigurationsInsight('host.name', hostName);
    expect(container).toBeEmptyDOMElement();
  });

  describe('should open entity flyout when clicking on badge', () => {
    it('should open host entity flyout when clicking on host badge', () => {
      (useMisconfigurationPreview as jest.Mock).mockReturnValue({
        data: { count: { passed: 1, failed: 2 } },
      });
      const { getByTestId } = renderMisconfigurationsInsight('host.name', hostName);
      expect(getByTestId(`${testId}-count`)).toHaveTextContent('3');

      getByTestId(`${testId}-count`).click();
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: HostPreviewPanelKey,
        params: {
          hostName,
          banner: HOST_PREVIEW_BANNER,
          scopeId: mockContextValue.scopeId,
        },
      });
    });

    it('should open user entity flyout when clicking on user badge', () => {
      (useMisconfigurationPreview as jest.Mock).mockReturnValue({
        data: { count: { passed: 2, failed: 3 } },
      });
      const { getByTestId } = renderMisconfigurationsInsight('user.name', userName);
      expect(getByTestId(`${testId}-count`)).toHaveTextContent('5');

      getByTestId(`${testId}-count`).click();
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: UserPreviewPanelKey,
        params: {
          userName,
          banner: USER_PREVIEW_BANNER,
          scopeId: mockContextValue.scopeId,
        },
      });
    });
  });
});
