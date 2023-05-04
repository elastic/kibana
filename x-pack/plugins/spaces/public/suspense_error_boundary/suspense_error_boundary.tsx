/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React, { Component, Suspense } from 'react';

import type { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

interface Props {
  notifications: NotificationsStart;
  /**
   * Whether or not to show a loading spinner while waiting for the child components to load.
   *
   * Default is true.
   */
  showLoadingSpinner?: boolean;
}

interface State {
  error: Error | null;
}

export class SuspenseErrorBoundary extends Component<PropsWithChildren<Props>, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    // Update state so next render shows fallback UI.
    return { error };
  }

  public componentDidCatch(error: Error) {
    const { notifications } = this.props;
    if (notifications) {
      const title = i18n.translate('xpack.spaces.uiApi.errorBoundaryToastTitle', {
        defaultMessage: 'Failed to load Kibana asset',
      });
      const toastMessage = i18n.translate('xpack.spaces.uiApi.errorBoundaryToastMessage', {
        defaultMessage: 'Reload page to continue.',
      });
      notifications.toasts.addError(error, { title, toastMessage });
    }
  }

  render() {
    const { children, notifications, showLoadingSpinner = true } = this.props;
    const { error } = this.state;
    if (!notifications || error) {
      return null;
    }
    const fallback = showLoadingSpinner ? <EuiLoadingSpinner /> : null;
    return <Suspense fallback={fallback}>{children}</Suspense>;
  }
}
