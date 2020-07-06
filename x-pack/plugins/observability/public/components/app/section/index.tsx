/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiAccordion, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ErrorPanel } from './error_panel';

interface Props {
  title: string;
  hasError: boolean;
  children: React.ReactNode;
  minHeight?: number;
  appLink?: string;
  appLinkName?: string;
}

export const SectionContainer = ({
  title,
  appLink,
  children,
  minHeight,
  hasError,
  appLinkName,
}: Props) => {
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
          <EuiLink href={appLink}>
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
        <EuiPanel
          hasShadow
          style={{
            minHeight: `${minHeight}px`,
            /*
             * This is needed to centralize the error message in the panel.
             * When a parent container sets min-height its children can't set height:100%
             * https://bugs.webkit.org/show_bug.cgi?id=26559
             */
            height: minHeight ? '1px' : undefined,
          }}
        >
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
