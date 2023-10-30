/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getStreamObservable } from './stream_observable';
// import { getReaderValue, mockUint8Arrays } from './mock';
import type { PromptObservableState } from './types';
// export const getReadableStreamMock = (): ReadableStreamDefaultReader<Uint8Array> =>
//   ({
//     read: jest
//       .fn()
//       .mockResolvedValueOnce({
//         done: false,
//         value: getReaderValue(mockUint8Arrays[0]),
//       })
//       .mockResolvedValueOnce({
//         done: false,
//         value: getReaderValue(mockUint8Arrays[1]),
//       })
//       .mockResolvedValue({
//         done: true,
//       }),
//     cancel: jest.fn(),
//     releaseLock: jest.fn(),
//     closed: jest.fn().mockResolvedValue(true),
//   } as unknown as ReadableStreamDefaultReader<Uint8Array>);
// const mockedStream = getReadableStreamMock();

describe('getStreamObservable', () => {
  const mockReader = {
    read: jest.fn(),
    cancel: jest.fn(),
  };

  const setLoading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.only('should emit loading state and chunks', (done) => {
    const expectedStates: PromptObservableState[] = [
      { chunks: [], loading: true },
      {
        chunks: [
          {
            id: '1',
            object: 'chunk',
            created: 1635633600000,
            model: 'model-1',
            choices: [
              {
                index: 0,
                delta: { role: 'role-1', content: 'content-1' },
                finish_reason: null,
              },
            ],
          },
        ],
        message: 'content-1',
        loading: true,
      },
      {
        chunks: [
          {
            id: '1',
            object: 'chunk',
            created: 1635633600000,
            model: 'model-1',
            choices: [
              {
                index: 0,
                delta: { role: 'role-1', content: 'content-1' },
                finish_reason: null,
              },
            ],
          },
        ],
        message: 'content-1',
        loading: false,
      },
    ];

    const source = getStreamObservable(mockReader, setLoading);
    const emittedStates: PromptObservableState[] = [];

    source.subscribe({
      next: (state) => emittedStates.push(state),
      complete: () => {
        expect(emittedStates).toEqual(expectedStates);
        expect(setLoading).toHaveBeenCalledWith(false);
        done();
      },
      error: (err) => done(err),
    });

    // Mock the read function to return a resolved promise with expected data
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(
        new TextEncoder().encode(`data: ${JSON.stringify(expectedStates[1].chunks[0])}`)
      ),
    });
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(new TextEncoder().encode('data: [DONE]\n')),
    });
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(
        new TextEncoder().encode(`data: ${JSON.stringify(expectedStates[1].chunks[0])}`)
      ),
    });
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: new Uint8Array(new TextEncoder().encode('data: [DONE]\n')),
    });
    mockReader.read.mockResolvedValueOnce({
      done: true,
      value: undefined,
    });
  });

  it('should handle errors', (done) => {
    const source = getStreamObservable(mockReader, setLoading);
    const error = new Error('Test Error');

    source.subscribe({
      next: (state) => {},
      complete: () => done(new Error('Should not complete')),
      error: (err) => {
        expect(err).toEqual(error);
        expect(setLoading).toHaveBeenCalledWith(false);
        done();
      },
    });

    // Simulate an error
    mockReader.read.mockRejectedValue(error);
  });

  it('should complete the observable when the reader is done', (done) => {
    const source = getStreamObservable(mockReader, setLoading);

    source.subscribe({
      next: (state) => {},
      complete: () => {
        expect(setLoading).toHaveBeenCalledWith(false);
        expect(mockReader.cancel).toHaveBeenCalled();
        done();
      },
      error: (err) => done(err),
    });

    // Simulate completion
    mockReader.read.mockResolvedValue({ done: true, value: undefined });
  });

  it('should emit values with the correct delay', (done) => {
    const expectedStates: PromptObservableState[] = [
      { chunks: [], loading: true },
      {
        chunks: [
          {
            id: '1',
            object: 'chunk',
            created: 1635633600000,
            model: 'model-1',
            choices: [
              {
                index: 0,
                delta: { role: 'role-1', content: 'content-1' },
                finish_reason: null,
              },
            ],
          },
        ],
        message: 'content-1',
        loading: true,
      },
      {
        chunks: [
          {
            id: '1',
            object: 'chunk',
            created: 1635633600000,
            model: 'model-1',
            choices: [
              {
                index: 0,
                delta: { role: 'role-1', content: 'content-1' },
                finish_reason: null,
              },
            ],
          },
        ],
        message: 'content-1',
        loading: false,
      },
    ];

    const source = getStreamObservable(mockReader, setLoading);
    const emittedStates: PromptObservableState[] = [];

    source.subscribe({
      next: (state) => emittedStates.push(state),
      complete: () => {
        expect(emittedStates).toEqual(expectedStates);
        expect(setLoading).toHaveBeenCalledWith(false);
        done();
      },
      error: (err) => done(err),
    });

    // Simulate reading data with a delay
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: new TextEncoder().encode(`data: ${JSON.stringify(expectedStates[1].chunks[0])}`),
    });
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: new TextEncoder().encode('data: [DONE]\n'),
    });
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: new TextEncoder().encode(`data: ${JSON.stringify(expectedStates[2].chunks[0])}`),
    });
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: new TextEncoder().encode('data: [DONE]\n'),
    });
    mockReader.read.mockResolvedValueOnce({
      done: true,
      value: undefined,
    });
  });
});
