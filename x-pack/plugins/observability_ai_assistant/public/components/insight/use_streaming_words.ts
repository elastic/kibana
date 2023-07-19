/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

interface UseStreamingTextProps {
  message: string;
}

export function useStreamingText({ message }: UseStreamingTextProps) {
  const [chatMessages, setChatMessages] = useState('');

  useEffect(() => {
    const words = message.split(' ');

    for (let i = 0; i < words.length; i++) {
      setTimeout(() => {
        setChatMessages((prevState) => `${prevState} ${words[i]}`);
      }, i * 50); // Adjust typing speed here (milliseconds per word)
    }
  }, [message]);

  return chatMessages;
}
