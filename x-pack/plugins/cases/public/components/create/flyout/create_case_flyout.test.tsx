/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateCaseFlyout } from './create_case_flyout';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { SECURITY_SOLUTION_OWNER } from '../../../../common';

jest.mock('../../../common/lib/kibana');
const mockSubmit = jest.fn();
jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => {
  const original = jest.requireActual('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib');
  return {
    ...original,
    useFormContext: () => ({
      isSubmitting: false,
      submit: mockSubmit,
      setFieldValue: jest.fn(),
      getFormData: jest.fn(),
    }),
  };
});
jest.mock('../../cases_context/use_cases_context');

const onClose = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  onClose,
  onSuccess,
  owner: 'securitySolution',
};

describe('CreateCaseFlyout', () => {
  let mockedContext: AppMockRenderer;
  beforeEach(() => {
    // (useFormContext as jest.Mock).mockReturnValue({ isSubmitting: false, submit: mockSubmit });
    (useCasesContext as jest.Mock).mockReturnValue({
      owner: SECURITY_SOLUTION_OWNER,
      isSubmit: false,
      features: {
        alerts: { enabled: true },
      },
    });
    mockedContext = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders', async () => {
    const { getByTestId } = mockedContext.render(<CreateCaseFlyout {...defaultProps} />);
    await act(async () => {
      expect(getByTestId('create-case-flyout')).toBeTruthy();
    });
  });

  it('should call onCloseCaseModal when closing the flyout', async () => {
    const { getByTestId } = mockedContext.render(<CreateCaseFlyout {...defaultProps} />);
    await act(async () => {
      userEvent.click(getByTestId('euiFlyoutCloseButton'));
    });
    expect(onClose).toBeCalled();
  });

  it('renders headerContent when passed', async () => {
    const headerContent = <p data-test-subj="testing123" />;
    const { getByTestId } = mockedContext.render(
      <CreateCaseFlyout {...defaultProps} headerContent={headerContent} />
    );

    await act(async () => {
      expect(getByTestId('testing123')).toBeTruthy();
      expect(getByTestId('create-case-flyout-header').children.length).toEqual(2);
    });
  });

  it('does not render headerContent when undefined', async () => {
    const { getByTestId } = mockedContext.render(<CreateCaseFlyout {...defaultProps} />);

    await act(async () => {
      expect(getByTestId('create-case-flyout-header').children.length).toEqual(1);
    });
  });

  it('does not call submit automatically if isSubmit=false', async () => {
    mockedContext.render(<CreateCaseFlyout {...defaultProps} />);
    await act(async () => {
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  it('calls submit automatically if isSubmit=true', async () => {
    (useCasesContext as jest.Mock).mockReturnValue({
      owner: SECURITY_SOLUTION_OWNER,
      isSubmit: true,
      features: {
        alerts: { enabled: true },
      },
    });
    mockedContext.render(<CreateCaseFlyout {...defaultProps} />);
    await act(async () => {
      expect(mockSubmit).toHaveBeenCalled();
    });
  });
});
