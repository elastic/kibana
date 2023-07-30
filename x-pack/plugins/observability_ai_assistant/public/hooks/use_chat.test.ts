/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { act, renderHook } from '@testing-library/react-hooks';
import { ChatCompletionResponseMessage } from 'openai';
import { Observable } from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { ObservabilityAIAssistantService } from '../types';
import { useChat } from './use_chat';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('./use_observability_ai_assistant');

const WAIT_OPTIONS = { timeout: 5000 };

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseObservabilityAIAssistant = useObservabilityAIAssistant as jest.MockedFunction<
  typeof useObservabilityAIAssistant
>;

const mockChat = jest.fn();

mockUseObservabilityAIAssistant.mockImplementation(
  () =>
    ({
      chat: mockChat,
    } as unknown as ObservabilityAIAssistantService)
);

function mockDeltas(deltas: Array<Partial<ChatCompletionResponseMessage>>) {
  mockResponse(
    Promise.resolve(
      new Observable((subscriber) => {
        async function simulateDelays() {
          for (const delta of deltas) {
            await new Promise<void>((resolve) => {
              setTimeout(() => {
                subscriber.next({
                  choices: [
                    {
                      role: 'assistant',
                      delta,
                    },
                  ],
                });
                resolve();
              }, 100);
            });
          }
          subscriber.complete();
        }

        simulateDelays();
      })
    )
  );
}

function mockResponse(response: Promise<any>) {
  mockChat.mockReturnValueOnce(response);
}

describe('useChat', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: { notifications: { showErrorDialog: jest.fn() } },
    } as any);
  });

  it('returns the result of the chat API', async () => {
    mockDeltas([{ content: 'testContent' }]);
    const { result, waitFor } = renderHook(() => useChat());

    act(() => {
      result.current.generate({ messages: [], connectorId: 'myConnectorId' });
    });

    expect(result.current.loading).toBeTruthy();
    expect(result.current.error).toBeUndefined();
    expect(result.current.content).toBeUndefined();

    await waitFor(() => result.current.loading === false, WAIT_OPTIONS);

    expect(result.current.error).toBeUndefined();
    expect(result.current.content).toBe('testContent');
  });

  it('handles 4xx and 5xx', async () => {
    mockResponse(Promise.reject(new Error()));
    const { result, waitFor } = renderHook(() => useChat());

    const catchMock = jest.fn();

    act(() => {
      result.current.generate({ messages: [], connectorId: 'myConnectorId' }).catch(catchMock);
    });

    await waitFor(() => result.current.loading === false, WAIT_OPTIONS);

    expect(catchMock).toHaveBeenCalled();

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.content).toBeUndefined();

    expect(mockUseKibana().services.notifications?.showErrorDialog).toHaveBeenCalled();
  });

  it('handles valid responses but generation errors', async () => {
    mockResponse(
      Promise.resolve(
        new Observable((subscriber) => {
          subscriber.next({ choices: [{ role: 'assistant', delta: { content: 'foo' } }] });
          setTimeout(() => {
            subscriber.error(new Error());
          }, 100);
        })
      )
    );

    const { result, waitFor } = renderHook(() => useChat());

    act(() => {
      result.current.generate({ messages: [], connectorId: 'myConnectorId' }).catch(() => {});
    });

    await waitFor(() => result.current.loading === false, WAIT_OPTIONS);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.content).toBe('foo');

    expect(mockUseKibana().services.notifications?.showErrorDialog).toHaveBeenCalled();
  });

  it('handles aborted requests', async () => {
    mockResponse(
      Promise.resolve(
        new Observable((subscriber) => {
          subscriber.next({ choices: [{ role: 'assistant', delta: { content: 'foo' } }] });
        })
      )
    );

    const { result, waitFor, unmount } = renderHook(() => useChat());

    act(() => {
      result.current.generate({ messages: [], connectorId: 'myConnectorId' });
    });

    await waitFor(() => result.current.content === 'foo', WAIT_OPTIONS);

    unmount();

    expect(mockUseKibana().services.notifications?.showErrorDialog).not.toHaveBeenCalled();
  });

  it('handles regenerations triggered by updates', async () => {
    mockResponse(
      Promise.resolve(
        new Observable((subscriber) => {
          subscriber.next({ choices: [{ role: 'assistant', delta: { content: 'foo' } }] });
        })
      )
    );

    const { result, waitFor } = renderHook(() => useChat());

    act(() => {
      result.current.generate({ messages: [], connectorId: 'myConnectorId' });
    });

    await waitFor(() => result.current.content === 'foo', WAIT_OPTIONS);

    mockDeltas([{ content: 'bar' }]);

    act(() => {
      result.current.generate({ messages: [], connectorId: 'myConnectorId' });
    });

    await waitFor(() => result.current.loading === false, WAIT_OPTIONS);

    expect(mockUseKibana().services.notifications?.showErrorDialog).not.toHaveBeenCalled();

    expect(result.current.content).toBe('bar');
  });

  it('handles streaming updates', async () => {
    mockDeltas([
      {
        content: 'my',
      },
      {
        content: ' ',
      },
      {
        content: 'update',
      },
    ]);

    const { result, waitForNextUpdate } = renderHook(() => useChat());

    act(() => {
      result.current.generate({ messages: [], connectorId: 'myConnectorId' });
    });

    await waitForNextUpdate(WAIT_OPTIONS);

    expect(result.current.content).toBe('my');

    await waitForNextUpdate(WAIT_OPTIONS);

    expect(result.current.content).toBe('my ');

    await waitForNextUpdate(WAIT_OPTIONS);

    expect(result.current.content).toBe('my update');
  });

  it('handles user aborts', async () => {
    const thenMock = jest.fn();
    const catchMock = jest.fn();

    mockResponse(
      Promise.resolve(
        new Observable((subscriber) => {
          subscriber.next({ choices: [{ role: 'assistant', delta: { content: 'foo' } }] });
        })
      )
    );

    const { result, waitForNextUpdate, waitFor } = renderHook(() => useChat());

    act(() => {
      result.current
        .generate({ messages: [], connectorId: 'myConnectorId' })
        .then(thenMock, catchMock);
    });

    await waitForNextUpdate(WAIT_OPTIONS);

    act(() => {
      result.current.abort();
    });

    await waitFor(() => thenMock.mock.calls.length > 0);

    expect(mockUseKibana().services.notifications?.showErrorDialog).not.toHaveBeenCalled();

    expect(result.current.content).toBe('foo');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(AbortError);

    expect(thenMock).toHaveBeenCalledWith({
      aborted: true,
      content: 'foo',
      function_call: {
        args: '',
        name: '',
      },
    });

    expect(catchMock).not.toHaveBeenCalled();
  });

  it('handles user regenerations', async () => {
    mockResponse(
      Promise.resolve(
        new Observable((subscriber) => {
          subscriber.next({ choices: [{ role: 'assistant', delta: { content: 'foo' } }] });
        })
      )
    );

    const { result, waitForNextUpdate } = renderHook(() => useChat());

    act(() => {
      result.current.generate({ messages: [], connectorId: 'myConnectorId' });
    });

    await waitForNextUpdate(WAIT_OPTIONS);

    act(() => {
      mockDeltas([{ content: 'bar' }]);
      result.current.generate({ messages: [], connectorId: 'mySecondConnectorId' });
    });

    await waitForNextUpdate(WAIT_OPTIONS);

    expect(mockUseKibana().services.notifications?.showErrorDialog).not.toHaveBeenCalled();

    expect(result.current.content).toBe('bar');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
});
