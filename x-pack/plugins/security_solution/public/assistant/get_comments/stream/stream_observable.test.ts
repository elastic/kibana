/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getStreamObservable } from './stream_observable';
// import { getReaderValue, mockUint8Arrays } from './mock';
import type { PromptObservableState } from './types';
import { Subject } from 'rxjs';
describe('getStreamObservable', () => {
  const mockReader = {
    read: jest.fn(),
    cancel: jest.fn(),
  };

  const typedReader = mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>;

  const setLoading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should emit loading state and chunks', (done) => {
    const completeSubject = new Subject<void>();
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

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(
          new TextEncoder().encode(`data: ${JSON.stringify(expectedStates[1].chunks[0])}`)
        ),
      })
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode(``)),
      })
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode('data: [DONE]\n')),
      })
      .mockResolvedValue({
        done: true,
      });

    const source = getStreamObservable(typedReader, setLoading);
    const emittedStates: PromptObservableState[] = [];

    source.subscribe({
      next: (state) => emittedStates.push(state),
      complete: () => {
        expect(emittedStates).toEqual(expectedStates);
        done();

        completeSubject.subscribe({
          next: () => {
            expect(setLoading).toHaveBeenCalledWith(false);
            expect(typedReader.cancel).toHaveBeenCalled();
            done();
          },
        });
      },
      error: (err) => done(err),
    });
  });

  it('should handle errors', (done) => {
    const completeSubject = new Subject<void>();
    const error = new Error('Test Error');
    // Simulate an error
    mockReader.read.mockRejectedValue(error);
    const source = getStreamObservable(typedReader, setLoading);

    source.subscribe({
      next: (state) => {},
      complete: () => done(new Error('Should not complete')),
      error: (err) => {
        expect(err).toEqual(error);
        done();
        completeSubject.subscribe({
          next: () => {
            expect(setLoading).toHaveBeenCalledWith(false);
            expect(typedReader.cancel).toHaveBeenCalled();
            done();
          },
        });
      },
    });
  });
});
