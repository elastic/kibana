/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, PropsWithRef, ReactElement } from 'react';
import React, { lazy, useEffect, useMemo, useState } from 'react';

import type { NotificationsStart, StartServicesAccessor } from 'src/core/public';

import type { PluginsStart } from '../plugin';
import { SuspenseErrorBoundary } from '../suspense_error_boundary';

interface InternalProps<T> {
  fn: () => Promise<FC<T>>;
  getStartServices: StartServicesAccessor<PluginsStart>;
  props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>;
}

export const LazyWrapper: <T>(props: InternalProps<T>) => ReactElement = ({
  fn,
  getStartServices,
  props,
}) => {
  const [notifications, setNotifications] = useState<NotificationsStart | undefined>(undefined);
  useEffect(() => {
    getStartServices().then(([coreStart]) => {
      setNotifications(coreStart.notifications);
    });
  });

  const LazyComponent = useMemo(() => lazy(() => fn().then((x) => ({ default: x }))), [fn]);

  if (!notifications) {
    return <></>;
  }

  return (
    <SuspenseErrorBoundary notifications={notifications}>
      <LazyComponent {...props} />
    </SuspenseErrorBoundary>
  );
};
