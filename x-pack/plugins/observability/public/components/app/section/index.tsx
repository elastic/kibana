/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiAccordion, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';

interface Props {
  title: string;
  subtitle: string;
  minHeight: number;
  appLink?: string;
  children: React.ReactNode;
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

export const SectionContainer = ({ title, appLink, children, subtitle, minHeight }: Props) => {
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
      <EuiPanel hasShadow style={{ minHeight: `${minHeight}px` }}>
        <EuiTitle size="xs">
          <h3>{subtitle}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {children}
      </EuiPanel>
    </StyledEuiAccordion>
  );
};
