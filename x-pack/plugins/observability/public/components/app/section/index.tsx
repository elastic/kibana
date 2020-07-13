/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiAccordion, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ErrorPanel } from './error_panel';
import { usePluginContext } from '../../../hooks/use_plugin_context';

interface Props {
  title: string;
  hasError: boolean;
  children: React.ReactNode;
  minHeight?: number;
  appLink?: string;
  appLinkName?: string;
}

export const SectionContainer = ({ title, appLink, children, hasError, appLinkName }: Props) => {
  const { core } = usePluginContext();
  return (
    <EuiAccordion
      initialIsOpen
      id={title}
      buttonContentClassName="accordion-button"
      buttonContent={
        <EuiTitle size="s">
          <h5>{title}</h5>
        </EuiTitle>
      }
      extraAction={
        appLink && (
          <EuiLink href={core.http.basePath.prepend(appLink)}>
            <EuiText size="s">
              {appLinkName
                ? appLinkName
                : i18n.translate('xpack.observability.chart.viewInAppLabel', {
                    defaultMessage: 'View in app',
                  })}
            </EuiText>
          </EuiLink>
        )
      }
    >
      <>
        <EuiSpacer size="s" />
        <EuiPanel hasShadow>
          {hasError ? (
            <ErrorPanel />
          ) : (
            <>
              <EuiSpacer size="s" />
              {children}
            </>
          )}
        </EuiPanel>
      </>
    </EuiAccordion>
  );
};
