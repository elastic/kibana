/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

export const useAutoBottomScroll = (deps?: any[]): React.RefObject<HTMLDivElement> => {
  const ref = useRef<HTMLDivElement>(null);
  const [isAutoScrollMode, setAutoBottomScroll] = useState<boolean>(true);

  useEffect(() => {
    if (ref.current && isAutoScrollMode) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  });

  useEffect(() => {
    const currentRef = ref.current;
    const calculateAutoScroll = () => {
      if (ref.current) {
        const newIsAutoScrollMode =
          ref.current.scrollTop + ref.current.clientHeight === ref.current.scrollHeight;

        if (newIsAutoScrollMode !== isAutoScrollMode) {
          setAutoBottomScroll(newIsAutoScrollMode);
        }
      }
    };

    currentRef?.addEventListener('scroll', calculateAutoScroll);

    return () => {
      currentRef?.removeEventListener('scroll', calculateAutoScroll);
    };
  }, [isAutoScrollMode, deps]);

  return ref;
};
