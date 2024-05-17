/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { waitForComponentToUpdate } from '../../../common/test_utils';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import { connectorsMock } from '../../../containers/mock';
import { useGetTags } from '../../../containers/use_get_tags';
import { useAvailableCasesOwners } from '../../app/use_available_owners';
import { useCaseConfigureResponse } from '../../configure_cases/__mock__';
import { CreateCaseFlyout } from './create_case_flyout';

jest.mock('../../../containers/use_get_tags');
jest.mock('../../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../../containers/configure/use_get_case_configuration');
jest.mock('../../markdown_editor/plugins/lens/use_lens_draft_comment');
jest.mock('../../app/use_available_owners');

const useGetTagsMock = useGetTags as jest.Mock;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useAvailableOwnersMock = useAvailableCasesOwners as jest.Mock;

const onClose = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  onClose,
  onSuccess,
  owner: 'securitySolution',
};

describe('CreateCaseFlyout', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    useAvailableOwnersMock.mockReturnValue(['securitySolution', 'observability']);
    useGetTagsMock.mockReturnValue({ data: ['test'] });
    useGetConnectorsMock.mockReturnValue({ isLoading: false, data: connectorsMock });
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
  });

  it('renders', async () => {
    appMockRenderer.render(<CreateCaseFlyout {...defaultProps} />);
    await waitForComponentToUpdate();

    expect(await screen.findByTestId('create-case-flyout')).toBeInTheDocument();
  });

  it('should call onCloseCaseModal when closing the flyout', async () => {
    appMockRenderer.render(<CreateCaseFlyout {...defaultProps} />);
    await waitForComponentToUpdate();

    userEvent.click(await screen.findByTestId('euiFlyoutCloseButton'));

    await waitFor(() => {
      expect(onClose).toBeCalled();
    });
  });

  it('renders headerContent when passed', async () => {
    const headerContent = <p data-test-subj="testing123" />;
    appMockRenderer.render(<CreateCaseFlyout {...defaultProps} headerContent={headerContent} />);
    await waitForComponentToUpdate();

    expect(await screen.findByTestId('testing123')).toBeInTheDocument();
    expect((await screen.findByTestId('create-case-flyout-header')).children.length).toEqual(2);
  });

  it('does not render headerContent when undefined', async () => {
    appMockRenderer.render(<CreateCaseFlyout {...defaultProps} />);
    await waitForComponentToUpdate();

    expect((await screen.findByTestId('create-case-flyout-header')).children.length).toEqual(1);
  });
});
