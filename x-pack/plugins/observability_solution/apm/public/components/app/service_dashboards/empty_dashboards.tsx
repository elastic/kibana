/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiEmptyPrompt, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dashboardsDark, dashboardsLight } from '@kbn/shared-svg';
import { useTheme } from '../../../hooks/use_theme';

interface Props {
  actions: React.ReactNode;
}

export function EmptyDashboards({ actions }: Props) {
  const theme = useTheme();

  return (
    <>
      <EuiEmptyPrompt
        hasShadow={false}
        hasBorder={false}
        icon={
          <EuiImage
            size="fullWidth"
            src={theme.darkMode ? dashboardsDark : dashboardsLight}
            alt=""
          />
        }
        title={
          <h2>
            {i18n.translate('xpack.apm.serviceDashboards.emptyTitle', {
              defaultMessage: 'The best way to understand your data is to visualize it.',
            })}
          </h2>
        }
        layout="horizontal"
        color="plain"
        body={
          <>
            <ul>
              <li>
                {i18n.translate('xpack.apm.serviceDashboards.emptyBody.first', {
                  defaultMessage: 'bring clarity to your data',
                })}
              </li>
              <li>
                {i18n.translate('xpack.apm.serviceDashboards.emptyBody.second', {
                  defaultMessage: 'tell a story about your data',
                })}
              </li>
              <li>
                {i18n.translate('xpack.apm.serviceDashboards.emptyBody', {
                  defaultMessage: 'focus on only the data that’s important to you',
                })}
              </li>
            </ul>
            <p>
              {i18n.translate('xpack.apm.serviceDashboards.emptyBody.getStarted', {
                defaultMessage: 'To get started, add your dashaboard',
              })}
            </p>
          </>
        }
        actions={actions}
      />
    </>
  );
}
