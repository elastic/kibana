/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { Subject, Subscription } from 'rxjs';

const refreshServiceGroupsSubject = new Subject<any[]>();

export function refreshServiceGroups(...args: any[]) {
  refreshServiceGroupsSubject.next(args);
}

export function RefreshServiceGroupsSubscriber({
  onRefresh,
  children,
}: {
  onRefresh: (...args: any[]) => void;
  children?: React.ReactNode;
}) {
  const subscription = useRef<Subscription | null>(null);
  useEffect(() => {
    if (!subscription.current) {
      subscription.current = refreshServiceGroupsSubject.subscribe(
        (args: any[] = []) => onRefresh(...args)
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
