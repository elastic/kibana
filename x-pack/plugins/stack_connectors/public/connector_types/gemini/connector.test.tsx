import React from 'react';
import { render, screen } from '@testing-library/react';
import GeminiConnectorFields from './connector'; // Import your component
import { ConnectorValidationFunc } from '@kbn/triggers-actions-ui-plugin/public/types';

// Mock the useFormData hook
jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => ({
  useFormData: jest.fn().mockReturnValue([{ id: 'gemini-connector', name: 'Gemini Connector' }]),
}));

describe('GeminiConnectorFields', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('renders the SimpleConnectorForm with correct props', () => {
    render(
      <GeminiConnectorFields
        readOnly={false}
        isEdit={false}
        registerPreSubmitValidator={function (validator: ConnectorValidationFunc): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    expect(screen.getByLabelText('API Key')).toBeInTheDocument(); // Example config field
    expect(screen.getByLabelText('API Secret')).toBeInTheDocument(); // Example secrets field
  });

  it('renders the DashboardLink when in edit mode', () => {
    render(
      <GeminiConnectorFields
        readOnly={false}
        isEdit={true}
        registerPreSubmitValidator={function (validator: ConnectorValidationFunc): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    expect(screen.getByText('Open Gemini dashboard')).toBeInTheDocument(); // Assuming this is the link text
  });

  it('does not render the DashboardLink when not in edit mode', () => {
    render(
      <GeminiConnectorFields
        readOnly={false}
        isEdit={false}
        registerPreSubmitValidator={function (validator: ConnectorValidationFunc): void {
          throw new Error('Function not implemented.');
        }}
      />
    );
    expect(screen.queryByText('Open Gemini dashboard')).toBeNull();
  });

  it('disables fields when readOnly is true', () => {
    render(
      <GeminiConnectorFields
        readOnly={true}
        isEdit={false}
        registerPreSubmitValidator={function (validator: ConnectorValidationFunc): void {
          throw new Error('Function not implemented.');
        }}
      />
    );

    expect(screen.getByLabelText('API Key')).toBeDisabled();
    expect(screen.getByLabelText('API Secret')).toBeDisabled();
  });
  // Add more tests for the form submit
});
