/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiAccordion, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { ErrorPanel } from './error_panel';

interface Props {
  title: string;
  subtitle: string;
  minHeight: number;
  hasError: boolean;
  children: React.ReactNode;
  appLink?: string;
}
const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__triggerWrapper {
    border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  }
  .euiAccordion__button {
    margin-bottom: 16px;
  }
  .euiAccordion__childWrapper {
    margin-top: 8px;
  }
`;

export const SectionContainer = ({
  title,
  appLink,
  children,
  subtitle,
  minHeight,
  hasError,
}: Props) => {
  return (
    <StyledEuiAccordion
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
              {i18n.translate('xpack.observability.chart.viewInAppLabel', {
                defaultMessage: 'View in app',
              })}
            </EuiText>
          </EuiLink>
        )
      }
    >
      <EuiPanel
        hasShadow
        style={{
          minHeight: `${minHeight}px`,
          /*
           * This is needed to centralize the error message in the panel.
           * When a parent container sets min-height its children can't set height:100%
           * https://bugs.webkit.org/show_bug.cgi?id=26559
           */
          height: '1px',
        }}
      >
        <EuiTitle size="xs">
          <h3>{subtitle}</h3>
        </EuiTitle>
        {hasError ? (
          <ErrorPanel />
        ) : (
          <>
            <EuiSpacer size="s" />
            {children}
          </>
        )}
      </EuiPanel>
    </StyledEuiAccordion>
  );
};
