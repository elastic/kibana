/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  ServiceMapEditorFlyout,
  type ServiceMapEditorFlyoutProps,
} from './service_map_editor_flyout';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../common/environment_filter_values';

function renderFlyout(props: Partial<ServiceMapEditorFlyoutProps> = {}) {
  const defaultProps: ServiceMapEditorFlyoutProps = {
    onCancel: jest.fn(),
    onSave: jest.fn(),
    ariaLabelledBy: 'flyout-title',
  };
  return render(
    <IntlProvider locale="en">
      <ServiceMapEditorFlyout {...defaultProps} {...props} />
    </IntlProvider>
  );
}

describe('<ServiceMapEditorFlyout/>', () => {
  describe('when adding a new panel', () => {
    it('displays the add panel title', () => {
      renderFlyout();
      expect(screen.getByText('Add service map panel')).toBeInTheDocument();
    });

    it('displays the add panel button', () => {
      renderFlyout();
      expect(screen.getByRole('button', { name: 'Add panel' })).toBeInTheDocument();
    });

    it('initializes environment to all environments', () => {
      renderFlyout();
      const select = screen.getByTestId('apmServiceMapEditorEnvironmentSelect');
      expect(select).toHaveValue(ENVIRONMENT_ALL.value);
    });
  });

  describe('when editing an existing panel', () => {
    const initialState = {
      environment: ENVIRONMENT_NOT_DEFINED.value,
      kuery: 'service.name: foo',
      serviceName: 'my-service',
    };

    it('displays the edit title', () => {
      renderFlyout({ initialState });
      expect(screen.getByText('Edit service map')).toBeInTheDocument();
    });

    it('displays the save button', () => {
      renderFlyout({ initialState });
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('populates service name from initial state', () => {
      renderFlyout({ initialState });
      expect(screen.getByTestId('apmServiceMapEditorServiceNameInput')).toHaveValue('my-service');
    });

    it('populates environment from initial state', () => {
      renderFlyout({ initialState });
      expect(screen.getByTestId('apmServiceMapEditorEnvironmentSelect')).toHaveValue(
        ENVIRONMENT_NOT_DEFINED.value
      );
    });

    it('populates kuery from initial state', () => {
      renderFlyout({ initialState });
      expect(screen.getByTestId('apmServiceMapEditorKueryInput')).toHaveValue('service.name: foo');
    });
  });

  describe('when the user submits the form', () => {
    it('calls onSave with form values', () => {
      const onSave = jest.fn();
      renderFlyout({ onSave });

      fireEvent.change(screen.getByTestId('apmServiceMapEditorServiceNameInput'), {
        target: { value: 'test-service' },
      });
      fireEvent.change(screen.getByTestId('apmServiceMapEditorEnvironmentSelect'), {
        target: { value: ENVIRONMENT_NOT_DEFINED.value },
      });
      fireEvent.change(screen.getByTestId('apmServiceMapEditorKueryInput'), {
        target: { value: 'host.name: server1' },
      });

      fireEvent.click(screen.getByTestId('apmServiceMapEditorSaveButton'));

      expect(onSave).toHaveBeenCalledWith({
        environment: ENVIRONMENT_NOT_DEFINED.value,
        kuery: 'host.name: server1',
        serviceName: 'test-service',
      });
    });

    it('omits empty optional fields', () => {
      const onSave = jest.fn();
      renderFlyout({ onSave });

      fireEvent.click(screen.getByTestId('apmServiceMapEditorSaveButton'));

      expect(onSave).toHaveBeenCalledWith({
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        serviceName: undefined,
      });
    });
  });

  describe('when the user cancels', () => {
    it('calls onCancel', () => {
      const onCancel = jest.fn();
      renderFlyout({ onCancel });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
