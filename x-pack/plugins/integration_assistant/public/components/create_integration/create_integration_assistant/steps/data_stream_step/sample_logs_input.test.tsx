/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../../mocks/test_provider';
import { parseNDJSON, SampleLogsInput } from './sample_logs_input';
import { ActionsProvider } from '../../state';
import { mockActions } from '../../mocks/state';
import { mockServices } from '../../../../../services/mocks/services';

const wrapper: React.FC = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

const changeFile = async (input: HTMLElement, file: File) => {
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(input).toHaveAttribute('data-loading', 'true'));
    await waitFor(() => expect(input).toHaveAttribute('data-loading', 'false'));
  });
};

describe('parseNDJSON', () => {
  const content = [{ message: 'test message 1' }, { message: 'test message 2' }];
  const simpleNDJSON = '{"message":"test message 1"}\n{ "message": "test message 2" }';
  const validNDJSONWithSpaces = `{"message":"test message 1"}
                                 {"message":"test message 2"}`;
  const multilineNDJSON = `{
                             "message":"test message 1"
                           }\n{ 
                             "message"
                               :
                             "test message 2"
                           }
  `;
  const singlelineArray = '[{"message":"test message 1"}, {"message":"test message 2"}]';
  const multilineArray = '[{"message":"test message 1"},\n{"message":"test message 2"}]';

  it('should parse valid NDJSON', () => {
    expect(parseNDJSON(simpleNDJSON, false)).toEqual(content);
    expect(parseNDJSON(simpleNDJSON, true)).toEqual(content);
  });

  it('should parse valid NDJSON with extra spaces in single-line mode', () => {
    expect(parseNDJSON(validNDJSONWithSpaces, false)).toEqual(content);
  });

  it('should not parse valid NDJSON with extra spaces in multiline mode', () => {
    expect(() => parseNDJSON(validNDJSONWithSpaces, true)).toThrow();
  });

  it('should not parse multiline NDJSON in single-line mode', () => {
    expect(() => parseNDJSON(multilineNDJSON, false)).toThrow();
  });

  it('should parse multiline NDJSON in multiline mode', () => {
    expect(parseNDJSON(multilineNDJSON, true)).toEqual(content);
  });

  it('should parse single-line JSON Array', () => {
    expect(parseNDJSON(singlelineArray, false)).toEqual([content]);
    expect(parseNDJSON(singlelineArray, true)).toEqual([content]);
  });

  it('should not parse a multi-line JSON Array', () => {
    expect(() => parseNDJSON(multilineArray, false)).toThrow();
    expect(() => parseNDJSON(multilineArray, true)).toThrow();
  });

  it('should parse single-line JSON with one entry', () => {
    const fileContent = '{"message":"test message 1"}';
    expect(parseNDJSON(fileContent)).toEqual([{ message: 'test message 1' }]);
  });

  it('should handle empty content', () => {
    expect(parseNDJSON('  ', false)).toEqual([]);
    expect(parseNDJSON('  ', true)).toEqual([]);
  });

  it('should handle empty lines in file content', () => {
    const fileContent = '\n\n{"message":"test message 1"}\n\n{"message":"test message 2"}\n\n';
    expect(parseNDJSON(fileContent, false)).toEqual(content);
    expect(parseNDJSON(fileContent, true)).toEqual(content);
  });
});

describe('SampleLogsInput', () => {
  let result: RenderResult;
  let input: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    result = render(<SampleLogsInput integrationSettings={undefined} />, { wrapper });
    input = result.getByTestId('logsSampleFilePicker');
  });

  describe('when uploading a json logs sample', () => {
    const type = 'application/json';

    describe('when the file is valid json', () => {
      const logsSampleRaw = `{"message":"test message 1"},{"message":"test message 2"}`;
      beforeEach(async () => {
        await changeFile(input, new File([`[${logsSampleRaw}]`], 'test.json', { type }));
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          logsSampleParsed: logsSampleRaw.split(','),
          logFormat: 'json',
        });
      });

      describe('when the file has too many rows', () => {
        const tooLargeLogsSample = Array(6).fill(logsSampleRaw).join(','); // 12 entries
        beforeEach(async () => {
          await changeFile(input, new File([`[${tooLargeLogsSample}]`], 'test.json', { type }));
        });

        it('should truncate the logs sample', () => {
          expect(mockActions.setIntegrationSettings).toBeCalledWith({
            logsSampleParsed: tooLargeLogsSample.split(',').slice(0, 10),
            logFormat: 'json',
          });
        });
        it('should add a notification toast', () => {
          expect(mockServices.notifications.toasts.addInfo).toBeCalledWith(
            `The logs sample has been truncated to 10 rows.`
          );
        });
      });
    });

    describe('when the file is invalid', () => {
      describe.each([
        [
          '[{"message":"test message 1"}',
          'Cannot parse the logs sample file as either a JSON or NDJSON file',
        ],
        ['["test message 1"]', 'The logs sample file contains non-object entries'],
        ['[]', 'The logs sample file is empty'],
      ])('with logs content %s', (logsSample, errorMessage) => {
        beforeEach(async () => {
          await changeFile(input, new File([logsSample], 'test.json', { type }));
        });

        it('should render error message', () => {
          expect(result.queryByText(errorMessage)).toBeInTheDocument();
        });

        it('should set the integrationSetting correctly', () => {
          expect(mockActions.setIntegrationSettings).toBeCalledWith({
            logsSampleParsed: undefined,
            logFormat: undefined,
          });
        });
      });
    });
  });

  describe('when setting a ndjson logs sample', () => {
    const type = 'application/x-ndjson';

    describe('when the file is valid ndjson', () => {
      const logsSampleRaw = `{"message":"test message 1"}\n{"message":"test message 2"}`;
      beforeEach(async () => {
        await changeFile(input, new File([logsSampleRaw], 'test.json', { type }));
      });

      it('should set the integrationSetting correctly', () => {
        expect(mockActions.setIntegrationSettings).toBeCalledWith({
          logsSampleParsed: logsSampleRaw.split('\n'),
          logFormat: 'ndjson',
        });
      });

      describe('when the file has too many rows', () => {
        const tooLargeLogsSample = Array(6).fill(logsSampleRaw).join('\n'); // 12 entries
        beforeEach(async () => {
          await changeFile(input, new File([tooLargeLogsSample], 'test.json', { type }));
        });

        it('should truncate the logs sample', () => {
          expect(mockActions.setIntegrationSettings).toBeCalledWith({
            logsSampleParsed: tooLargeLogsSample.split('\n').slice(0, 10),
            logFormat: 'ndjson',
          });
        });
        it('should add a notification toast', () => {
          expect(mockServices.notifications.toasts.addInfo).toBeCalledWith(
            `The logs sample has been truncated to 10 rows.`
          );
        });
      });
    });

    describe('when the file is invalid', () => {
      describe.each([
        [
          '{"message":"test message 1"}\n{"message": }',
          'Cannot parse the logs sample file as either a JSON or NDJSON file',
        ],
        ['"test message 1"', 'The logs sample file contains non-object entries'],
        ['', 'The logs sample file is empty'],
      ])('with logs content %s', (logsSample, errorMessage) => {
        beforeEach(async () => {
          await changeFile(input, new File([logsSample], 'test.json', { type }));
        });

        it('should render error message', () => {
          expect(result.queryByText(errorMessage)).toBeInTheDocument();
        });

        it('should set the integrationSetting correctly', () => {
          expect(mockActions.setIntegrationSettings).toBeCalledWith({
            logsSampleParsed: undefined,
            logFormat: undefined,
          });
        });
      });
    });
  });
});
