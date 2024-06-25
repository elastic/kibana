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
  isEnabledLangChain: boolean;
  isError: boolean;
  content?: string;
  actionTypeId: string;
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
  //  A function to mark the streaming as complete, with a parameter to indicate if the streaming was aborted.
  setComplete: (args: { complete: boolean; didAbort: boolean }) => void;
}
/**
 * A hook that takes a ReadableStreamDefaultReader and returns an object with properties and functions
 * that can be used to handle streaming data from a readable stream
 * @param content - the content of the message. If provided, the function will not use the reader to stream data.
 * @param actionTypeId - the actionTypeId of the connector type
 * @param refetchCurrentConversation - refetch the current conversation
 * @param reader - The readable stream reader used to stream data. If provided, the function will use this reader to stream data.
 * @param isEnabledLangChain - indicates whether langchain is enabled or not
 * @param isError - indicates whether the reader response is an error message or not
 * @param reader - The readable stream reader used to stream data. If provided, the function will use this reader to stream data.
 */
export const useStream = ({
  content,
  actionTypeId,
  isEnabledLangChain,
  isError,
  reader,
  refetchCurrentConversation,
}: UseStreamProps): UseStream => {
  const [pendingMessage, setPendingMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [subscription, setSubscription] = useState<Subscription | undefined>();
  const observer$ = useMemo(
    () =>
      content == null && reader != null
        ? getStreamObservable({ actionTypeId, reader, setLoading, isEnabledLangChain, isError })
        : getPlaceholderObservable(),
    [content, isEnabledLangChain, isError, reader, actionTypeId]
  );
  const onCompleteStream = useCallback(
    (didAbort: boolean) => {
      subscription?.unsubscribe();
      setLoading(false);
      if (!didAbort) {
        refetchCurrentConversation();
      }
    },
    [refetchCurrentConversation, subscription]
  );

  const [complete, setComplete] = useState<{ complete: boolean; didAbort: boolean }>({
    complete: false,
    didAbort: false,
  });

  useEffect(() => {
    if (complete.complete) {
      onCompleteStream(complete.didAbort);
      setComplete({ complete: false, didAbort: false });
    }
  }, [complete, onCompleteStream]);

  useEffect(() => {
    const newSubscription = observer$.subscribe({
      next: ({ message, loading: isLoading }) => {
        setLoading(isLoading);
        setPendingMessage(message);
      },
      complete: () => {
        setComplete({ complete: true, didAbort: false });
      },
      error: (err) => {
        if (err.name === 'AbortError') {
          // the fetch was canceled, we don't need to do anything about it
        } else {
          setError(err.message);
        }
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
