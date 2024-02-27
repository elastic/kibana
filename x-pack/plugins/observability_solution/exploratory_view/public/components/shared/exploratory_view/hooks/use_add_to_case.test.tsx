/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAddToCase } from './use_add_to_case';
import React, { useEffect } from 'react';
import { render } from '../rtl_helpers';
import { EuiButton } from '@elastic/eui';
import { fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';

describe('useAddToCase', function () {
  function setupTestComponent() {
    const setData = jest.fn();
    function TestComponent() {
      const getToastText = jest.fn();

      const result = useAddToCase({
        lensAttributes: { title: 'Test lens attributes' } as any,
        timeRange: { to: 'now', from: 'now-5m' },
        getToastText,
      });
      useEffect(() => {
        setData(result);
      }, [result]);

      return (
        <span>
          <EuiButton
            data-test-subj="o11yTestComponentAddNewCaseButton"
            onClick={() => result.onCaseClicked()}
          >
            Add new case
          </EuiButton>
          <EuiButton
            data-test-subj="o11yTestComponentOnCaseClickButton"
            onClick={() => result.onCaseClicked({ id: 'test' } as any)}
          >
            On case click
          </EuiButton>
        </span>
      );
    }

    const renderSetup = render(<TestComponent />);

    return { setData, ...renderSetup };
  }
  it('should return expected result', async function () {
    const { setData, core, findByText } = setupTestComponent();

    expect(setData).toHaveBeenLastCalledWith({
      isCasesOpen: false,
      isSaving: false,
      onCaseClicked: expect.any(Function),
      setIsCasesOpen: expect.any(Function),
    });

    await act(async () => {
      fireEvent.click(await findByText('Add new case'));
    });

    expect(core.application?.navigateToApp).toHaveBeenCalledTimes(1);
    expect(core.application?.navigateToApp).toHaveBeenCalledWith('observability', {
      deepLinkId: 'cases_create',
      openInNewTab: true,
    });

    await act(async () => {
      fireEvent.click(await findByText('On case click'));
    });

    expect(core.http?.post).toHaveBeenCalledTimes(1);
    expect(core.http?.post).toHaveBeenCalledWith('/api/cases/test/comments', {
      body: '{"persistableStateAttachmentState":{"attributes":{"title":"Test lens attributes"},"timeRange":{"to":"now","from":"now-5m"}},"persistableStateAttachmentTypeId":".lens","type":"persistableState","owner":"observability"}',
    });
  });
});
