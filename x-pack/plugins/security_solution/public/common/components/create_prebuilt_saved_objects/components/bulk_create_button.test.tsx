/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ImportSavedObjectsButton } from './bulk_create_button';
import { bulkCreatePrebuiltSavedObjects } from '../apis/bulk_create_prebuilt_saved_objects';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../../hooks/use_app_toasts.mock';

jest.mock('../../../lib/kibana');
jest.mock('../apis/bulk_create_prebuilt_saved_objects');
jest.mock('../../../hooks/use_app_toasts');

describe('ImportSavedObjectsButton', () => {
  const mockBulkCreatePrebuiltSavedObjects = bulkCreatePrebuiltSavedObjects as jest.Mock;
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkCreatePrebuiltSavedObjects.mockReset();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  it('renders null', () => {
    const { container } = render(
      <ImportSavedObjectsButton
        hide={true}
        successTitle="Success"
        templateName="hostRiskScoreDashboards"
        title="Import saved objects"
      />
    );
    expect(container.childElementCount).toEqual(0);
  });

  it('renders bulk create button', () => {
    render(
      <ImportSavedObjectsButton
        hide={false}
        successTitle="Success"
        templateName="hostRiskScoreDashboards"
        title="Import saved objects"
      />
    );
    expect(screen.getByTestId('create-saved-object-button')).toBeInTheDocument();
  });

  it('show loading icon when import saved objects', async () => {
    render(
      <ImportSavedObjectsButton
        hide={false}
        successTitle="Success"
        templateName="hostRiskScoreDashboards"
        title="Import saved objects"
      />
    );
    expect(screen.getByTestId('create-saved-object-button')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('create-saved-object-button'));
    });

    await waitFor(() => {
      expect(mockBulkCreatePrebuiltSavedObjects).toHaveBeenCalled();
      expect(screen.getByTestId('creating-saved-objects')).toBeInTheDocument();
    });
  });

  it('renders button with successLink if successLink is given', () => {
    render(
      <ImportSavedObjectsButton
        hide={false}
        successLink="/test"
        successTitle="Success"
        templateName="hostRiskScoreDashboards"
        title="Import saved objects"
      />
    );
    expect(screen.getByTestId('create-saved-object-success-button')).toBeInTheDocument();
  });

  it('renders button with successLink on import module success', async () => {
    mockBulkCreatePrebuiltSavedObjects.mockResolvedValue({
      saved_objects: [
        {
          attributes: {
            title: 'my saved object title 1',
            name: 'my saved object name 1',
          },
        },
      ],
    });

    render(
      <ImportSavedObjectsButton
        hide={false}
        successTitle="Success"
        templateName="hostRiskScoreDashboards"
        title="Import saved objects"
      />
    );

    act(() => {
      fireEvent.click(screen.getByTestId('create-saved-object-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('create-saved-object-success-button')).toBeInTheDocument();
    });
  });

  it('renders success toast on import module success', async () => {
    mockBulkCreatePrebuiltSavedObjects.mockResolvedValue({
      saved_objects: [
        {
          attributes: {
            title: 'my saved object title 1',
            name: 'my saved object name 1',
          },
        },
      ],
    });

    render(
      <ImportSavedObjectsButton
        hide={false}
        successTitle="Success"
        templateName="hostRiskScoreDashboards"
        title="Import saved objects"
      />
    );

    act(() => {
      fireEvent.click(screen.getByTestId('create-saved-object-button'));
    });

    await waitFor(() => {
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith({
        text: 'my saved object title 1',
        title: '1 saved object imported successfully',
      });
    });
  });

  it('renders error toast on import module failure', async () => {
    const mockError = new Error('Template not found!!');
    mockBulkCreatePrebuiltSavedObjects.mockRejectedValue(mockError);

    render(
      <ImportSavedObjectsButton
        hide={false}
        successTitle="Success"
        templateName="errorTemplate"
        title="Import saved objects"
      />
    );

    act(() => {
      fireEvent.click(screen.getByTestId('create-saved-object-button'));
    });

    await waitFor(() => {
      expect(appToastsMock.addError).toHaveBeenCalledWith(mockError, {
        title: 'Failed to import saved objects',
        toastMessage: 'Template not found!!',
      });
    });
  });
});
