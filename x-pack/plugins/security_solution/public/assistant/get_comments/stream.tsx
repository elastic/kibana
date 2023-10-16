/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

export const StreamComment = ({ reader }: { reader: ReadableStreamDefaultReader<Uint8Array> }) => {
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            setLoading(false);
            break;
          }

          const decodedChunk = decoder.decode(value, { stream: true });
          setData((prevValue: string) => `${prevValue}${decodedChunk}`);
        }
      } catch (error) {
        setLoading(false);
        // Handle other errors
      }
    };

    fetchData();
  }, [reader]);

  return (
    <span>
      <b>{loading && <i>{'Fetching response...'}</i>}</b>
      {data}
    </span>
  );
};
