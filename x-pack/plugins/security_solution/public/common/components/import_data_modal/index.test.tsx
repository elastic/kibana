/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { ImportDataModalComponent } from '.';

jest.mock('../../lib/kibana');

jest.mock('../../lib/kibana/kibana_react', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: { http: { basePath: { prepend: jest.fn() } } },
  }),
}));
jest.mock('../../hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
  }),
}));

const closeModal = jest.fn();
const importComplete = jest.fn();
const importData = jest.fn().mockReturnValue({ success: true, errors: [] });
const file = new File(['file'], 'image1.png', { type: 'image/png' });

describe('ImportDataModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('renders correctly against snapshot', () => {
    const wrapper = render(
      <ImportDataModalComponent
        showModal={true}
        closeModal={closeModal}
        importComplete={importComplete}
        checkBoxLabel="checkBoxLabel"
        description="description"
        errorMessage={jest.fn()}
        failedDetailed={jest.fn()}
        importData={importData}
        showCheckBox={true}
        submitBtnText="submitBtnText"
        subtitle="subtitle"
        successMessage={jest.fn((totalCount) => 'successMessage')}
        title="title"
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
  test('should import file, cleanup the states and close Modal', async () => {
    const { queryByTestId } = render(
      <ImportDataModalComponent
        showModal={true}
        closeModal={closeModal}
        importComplete={importComplete}
        checkBoxLabel="checkBoxLabel"
        description="description"
        errorMessage={jest.fn()}
        failedDetailed={jest.fn()}
        importData={importData}
        showCheckBox={true}
        submitBtnText="submitBtnText"
        subtitle="subtitle"
        successMessage={jest.fn((totalCount) => 'successMessage')}
        title="title"
      />
    );
    await waitFor(() => {
      fireEvent.change(queryByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      });
    });
    await waitFor(() => {
      fireEvent.click(queryByTestId('import-data-modal-button') as HTMLButtonElement);
    });
    expect(importData).toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();
    expect(importComplete).toHaveBeenCalled();
  });
  test('should uncheck the selected checkboxes after importing new file', async () => {
    const { queryByTestId } = render(
      <ImportDataModalComponent
        showModal={true}
        closeModal={closeModal}
        importComplete={importComplete}
        checkBoxLabel="checkBoxLabel"
        description="description"
        errorMessage={jest.fn()}
        failedDetailed={jest.fn()}
        importData={importData}
        showCheckBox={true}
        submitBtnText="submitBtnText"
        subtitle="subtitle"
        successMessage={jest.fn((totalCount) => 'successMessage')}
        title="title"
        showExceptionsCheckBox={true}
        showActionConnectorsCheckBox={true}
      />
    );
    const overwriteCheckbox: HTMLInputElement = queryByTestId(
      'importDataModalCheckboxLabel'
    ) as HTMLInputElement;
    const exceptionCheckbox: HTMLInputElement = queryByTestId(
      'importDataModalExceptionsCheckboxLabel'
    ) as HTMLInputElement;
    const connectorsCheckbox: HTMLInputElement = queryByTestId(
      'importDataModalActionConnectorsCheckbox'
    ) as HTMLInputElement;

    await waitFor(() => fireEvent.click(overwriteCheckbox));
    await waitFor(() => fireEvent.click(exceptionCheckbox));
    await waitFor(() => fireEvent.click(connectorsCheckbox));

    await waitFor(() =>
      fireEvent.change(queryByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      })
    );
    expect(overwriteCheckbox.checked).toBeTruthy();
    expect(exceptionCheckbox.checked).toBeTruthy();
    expect(connectorsCheckbox.checked).toBeTruthy();

    await waitFor(() => {
      fireEvent.click(queryByTestId('import-data-modal-button') as HTMLButtonElement);
    });
    expect(importData).toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();

    expect(overwriteCheckbox.checked).toBeFalsy();
    expect(exceptionCheckbox.checked).toBeFalsy();
    expect(connectorsCheckbox.checked).toBeFalsy();
  });
  test('should uncheck the selected checkboxes after closing the Flyout', async () => {
    const { queryByTestId, getAllByRole } = render(
      <ImportDataModalComponent
        showModal={true}
        closeModal={closeModal}
        importComplete={importComplete}
        checkBoxLabel="checkBoxLabel"
        description="description"
        errorMessage={jest.fn()}
        failedDetailed={jest.fn()}
        importData={importData}
        showCheckBox={true}
        submitBtnText="submitBtnText"
        subtitle="subtitle"
        successMessage={jest.fn((totalCount) => 'successMessage')}
        title="title"
        showExceptionsCheckBox={true}
        showActionConnectorsCheckBox={true}
      />
    );

    const closeButton = getAllByRole('button')[0];

    const overwriteCheckbox: HTMLInputElement = queryByTestId(
      'importDataModalCheckboxLabel'
    ) as HTMLInputElement;
    const exceptionCheckbox: HTMLInputElement = queryByTestId(
      'importDataModalExceptionsCheckboxLabel'
    ) as HTMLInputElement;
    const connectorsCheckbox: HTMLInputElement = queryByTestId(
      'importDataModalActionConnectorsCheckbox'
    ) as HTMLInputElement;

    await waitFor(() => fireEvent.click(overwriteCheckbox));
    await waitFor(() => fireEvent.click(exceptionCheckbox));
    await waitFor(() => fireEvent.click(connectorsCheckbox));

    await waitFor(() =>
      fireEvent.change(queryByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      })
    );
    expect(overwriteCheckbox.checked).toBeTruthy();
    expect(exceptionCheckbox.checked).toBeTruthy();

    await waitFor(() => {
      fireEvent.click(closeButton as HTMLButtonElement);
    });
    expect(closeModal).toHaveBeenCalled();

    expect(overwriteCheckbox.checked).toBeFalsy();
    expect(exceptionCheckbox.checked).toBeFalsy();
    expect(connectorsCheckbox.checked).toBeFalsy();
  });

  test('should import file, with warnings but no action_connectors_success_count', async () => {
    const importWithWarning = jest.fn().mockReturnValue({
      ...importData(),
      action_connectors_warnings: [
        { message: 'message', actionPath: 'path', buttonLabel: 'buttonLabel' },
      ],
      action_connectors_success_count: 0,
    });
    const wrapper = render(
      <ImportDataModalComponent
        showModal={true}
        closeModal={closeModal}
        importComplete={importComplete}
        checkBoxLabel="checkBoxLabel"
        description="description"
        errorMessage={jest.fn()}
        failedDetailed={jest.fn()}
        importData={importWithWarning}
        showCheckBox={true}
        submitBtnText="submitBtnText"
        subtitle="subtitle"
        successMessage={jest.fn((totalCount) => 'successMessage')}
        title="title"
      />
    );
    const { queryByTestId } = wrapper;
    await waitFor(() => {
      fireEvent.change(queryByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      });
    });
    await waitFor(() => {
      fireEvent.click(queryByTestId('import-data-modal-button') as HTMLButtonElement);
    });
    expect(wrapper).toMatchSnapshot();
    expect(queryByTestId('actionConnectorsWarningsCallOut')).not.toBeInTheDocument();
    expect(importWithWarning).toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
    expect(importComplete).toHaveBeenCalled();
  });
  test('should import file, with warnings', async () => {
    const importWithWarning = jest.fn().mockReturnValue({
      ...importData(),
      action_connectors_warnings: [
        { message: 'message', actionPath: 'path', buttonLabel: 'buttonLabel' },
      ],
      action_connectors_success_count: 1,
    });
    const wrapper = render(
      <ImportDataModalComponent
        showModal={true}
        closeModal={closeModal}
        importComplete={importComplete}
        checkBoxLabel="checkBoxLabel"
        description="description"
        errorMessage={jest.fn()}
        failedDetailed={jest.fn()}
        importData={importWithWarning}
        showCheckBox={true}
        submitBtnText="submitBtnText"
        subtitle="subtitle"
        successMessage={jest.fn((totalCount) => 'successMessage')}
        title="title"
      />
    );
    const { queryByTestId } = wrapper;
    await waitFor(() => {
      fireEvent.change(queryByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      });
    });
    await waitFor(() => {
      fireEvent.click(queryByTestId('import-data-modal-button') as HTMLButtonElement);
    });
    expect(wrapper).toMatchSnapshot();
    expect(queryByTestId('actionConnectorsWarningsCallOut')).toBeInTheDocument();
    expect(importWithWarning).toHaveBeenCalled();
    expect(importComplete).toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
