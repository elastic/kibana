/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { Subject, Subscription } from 'rxjs';

const refreshServiceGroupsSubject = new Subject<void>();

export function refreshServiceGroups() {
  refreshServiceGroupsSubject.next();
}

export function RefreshServiceGroupsSubscriber({
  onRefresh,
  children,
}: {
  onRefresh: () => void;
  children?: React.ReactNode;
}) {
  const subscription = useRef<Subscription | null>(null);
  useEffect(() => {
    if (!subscription.current) {
      subscription.current = refreshServiceGroupsSubject.subscribe(() =>
        onRefresh()
      );
    }
    return () => {
      if (!subscription.current) {
        return;
      }
      subscription.current.unsubscribe();
    };
  }, [onRefresh]);
  return <>{children}</>;
}
