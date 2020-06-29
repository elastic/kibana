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
  appLink?: string;
  children: React.ReactNode;
}

export const SectionContainer = ({ title, appLink, children, subtitle }: Props) => {
  return (
    <EuiAccordion
      initialIsOpen
      id={title}
      buttonContentClassName="accordion-button"
      buttonContent={
        <EuiTitle size="m">
          <h5>{title}</h5>
        </EuiTitle>
      }
      extraAction={
        appLink && (
          <EuiButtonEmpty href={appLink}>
            {i18n.translate('xpack.observability.chart.viewInAppLabel', {
              defaultMessage: 'View in app',
            })}
          </EuiButtonEmpty>
        )
      }
    >
      <EuiPanel hasShadow>
        <EuiText size="m">
          <h3>{subtitle}</h3>
        </EuiText>
        <EuiSpacer size="s" />
        {children}
      </EuiPanel>
    </EuiAccordion>
  );
};
