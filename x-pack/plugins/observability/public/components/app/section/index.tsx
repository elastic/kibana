/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiAccordion, EuiButtonEmpty, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';

interface Props {
  title: string;
  subtitle: string;
  minHeight: number;
  appLink?: string;
  children: React.ReactNode;
}

export const SectionContainer = ({ title, appLink, children, subtitle, minHeight }: Props) => {
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
          <EuiButtonEmpty href={appLink}>
            <EuiText size="s">
              {i18n.translate('xpack.observability.chart.viewInAppLabel', {
                defaultMessage: 'View in app',
              })}
            </EuiText>
          </EuiButtonEmpty>
        )
      }
    >
      <EuiPanel hasShadow style={{ minHeight: `${minHeight}px` }}>
        <EuiText size="xs">
          <h3>{subtitle}</h3>
        </EuiText>
        <EuiSpacer size="s" />
        {children}
      </EuiPanel>
    </EuiAccordion>
  );
};
