/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { Toast } from '@kbn/core-notifications-browser';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { KUBERNETES_FEEDBACK_LINK } from './survey_kubernetes_link';

const KUBERNETES_TOAST_STORAGE_KEY = 'kubernetesToastSeen';

export const SurveyKubernetesToast = (showKubernetesSurvey: boolean) => {
  const { notifications, theme } = useKibanaContextForPlugin().services;
  const theme$ = theme.theme$;

  const isToastSeen = localStorage.getItem(KUBERNETES_TOAST_STORAGE_KEY) === 'true';

  if (isToastSeen && !showKubernetesSurvey) return;

  const onToastDismiss = (toast: Toast, openSurvey: boolean) => {
    if (isToastSeen) return;
    if (openSurvey) {
      window.open(KUBERNETES_FEEDBACK_LINK, '_blank', 'noreferrer');
    }
    notifications!.toasts.remove(toast);
    localStorage.setItem(KUBERNETES_TOAST_STORAGE_KEY, 'true');
  };

  if (showKubernetesSurvey && !isToastSeen) {
    const toast = notifications.toasts.addInfo({
      title: toMountPoint(
        <FormattedMessage
          id="xpack.infra.homePage.kubernetesToastTitle"
          defaultMessage="We need your help!"
        />
      ),
      color: 'primary',
      iconType: 'help',
      toastLifeTimeMs: Infinity,
      text: toMountPoint(
        <div>
          <p>
            <FormattedMessage
              id="xpack.infra.homePage.kubernetesToastText"
              defaultMessage="Help us design your Kubernetes experience by completing a feedback survey."
            />
          </p>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={() => {
                  onToastDismiss(toast, true);
                }}
                size="s"
              >
                Start survey
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>,
        { theme$ }
      ),
      onClose: () => {
        onToastDismiss(toast, false);
      },
    });
  }
};
