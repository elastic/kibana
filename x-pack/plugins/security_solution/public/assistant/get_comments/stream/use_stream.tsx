/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Subscription } from 'rxjs';
import { getPlaceholderObservable, getStreamObservable } from './stream_observable';

interface UseStreamProps {
  refetchCurrentConversation: () => void;
  isError: boolean;
  content?: string;
  llmType: string;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
}
interface UseStream {
  // The error message, if an error occurs during streaming.
  error: string | undefined;
  // Indicates whether the streaming is in progress or not
  isLoading: boolean;
  // Indicates whether the streaming is in progress and there is a pending message.
  isStreaming: boolean;
  // The pending message from the streaming data.
  pendingMessage: string;
  //  A function to mark the streaming as complete
  setComplete: (complete: boolean) => void;
}
/**
 * A hook that takes a ReadableStreamDefaultReader and returns an object with properties and functions
 * that can be used to handle streaming data from a readable stream
 * @param content - the content of the message. If provided, the function will not use the reader to stream data.
 * @param connectorTypeTitle - the title of the connector type
 * @param refetchCurrentConversation - refetch the current conversation
 * @param reader - The readable stream reader used to stream data. If provided, the function will use this reader to stream data.
 * @param isError - indicates whether the reader response is an error message or not
 */
export const useStream = ({
  content,
  llmType,
  reader,
  refetchCurrentConversation,
  isError,
}: UseStreamProps): UseStream => {
  const [pendingMessage, setPendingMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [subscription, setSubscription] = useState<Subscription | undefined>();
  const observer$ = useMemo(
    () =>
      content == null && reader != null
        ? getStreamObservable({ llmType, reader, setLoading, isError })
        : getPlaceholderObservable(),
    [content, isError, reader, llmType]
  );
  const onCompleteStream = useCallback(() => {
    subscription?.unsubscribe();
    setLoading(false);
    refetchCurrentConversation();
  }, [refetchCurrentConversation, subscription]);

  const [complete, setComplete] = useState(false);
  useEffect(() => {
    if (complete) {
      setComplete(false);
      onCompleteStream();
    }
  }, [complete, onCompleteStream]);
  useEffect(() => {
    const newSubscription = observer$.subscribe({
      next: ({ message, loading: isLoading }) => {
        setLoading(isLoading);
        setPendingMessage(message);
      },
      complete: () => {
        setComplete(true);
      },
      error: (err) => {
        setError(err.message);
      },
    });
    setSubscription(newSubscription);
  }, [observer$]);
  return {
    error,
    isLoading: loading,
    isStreaming: loading && pendingMessage != null,
    pendingMessage: pendingMessage ?? '',
    setComplete,
  };
};
