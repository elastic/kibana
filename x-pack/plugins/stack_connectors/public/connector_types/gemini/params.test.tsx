import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public';
import GeminiParamsFields from './params';
import { DEFAULT_BODY } from './constants';
import { SUB_ACTION } from '@kbn/stack-connectors-plugin/common/gemini/constants';
import { ActionVariable } from '@kbn/alerting-types';

interface JsonEditorWithMessageVariablesProps {
  inputTargetValue: string;
  onDocumentsChange: (value: string) => void;
  // Add any other props your component needs
}

// Mock necessary dependencies
jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  // ... (other mocks)
  JsonEditorWithMessageVariables: ({
    inputTargetValue,
    onDocumentsChange,
  }: JsonEditorWithMessageVariablesProps) => (
    <textarea
      data-testid="json-editor"
      value={inputTargetValue}
      onChange={(e) => onDocumentsChange(e.target.value)}
    />
  ),
}));

describe('GeminiParamsFields', () => {
  const mockEditAction = jest.fn();
  const testActionVariables: ActionVariable[] = [
    { name: 'var1', description: 'Variable 1' },
    { name: 'var2', description: 'Variable 2', deprecated: true },
    { name: 'var3', description: 'Variable 3', useWithTripleBracesInTemplates: true },
  ];

  it('renders and updates fields correctly', async () => {
    render(
      <GeminiParamsFields
        actionParams={{ subAction: SUB_ACTION.RUN, subActionParams: { body: DEFAULT_BODY } }}
        editAction={mockEditAction}
        index={0}
        messageVariables={testActionVariables}
        executionMode={ActionConnectorMode.Test}
        errors={{}}
      />
    );

    // Check if the JSON editor and model input are rendered
    const jsonEditor = screen.getByTestId('json-editor');
    const modelInput = screen.getByTestId('gemini-model');
    expect(jsonEditor).toBeInTheDocument();
    expect(modelInput).toBeInTheDocument();

    // Check if default values are set
    expect(jsonEditor).toHaveValue(DEFAULT_BODY);
    expect(modelInput).toHaveValue(''); // Model is empty by default

    // Simulate user input
    await userEvent.type(jsonEditor, '{ "key": "value" }');
    await userEvent.type(modelInput, 'gemini-003');

    // Check if editAction is called with updated values
    expect(mockEditAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{ "key": "value" }', model: 'gemini-003' },
      0
    );
  });

  // Add more tests to cover different scenarios, such as:
  // - Initial rendering with no subAction or subActionParams
  // - Editing the JSON and clearing it
  // - Switching between test and config modes
  // - Handling errors
});
