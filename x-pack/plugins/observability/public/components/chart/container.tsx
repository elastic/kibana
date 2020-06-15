/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiAccordion, EuiButtonEmpty, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  title: string;
  appLink?: string;
  children: React.ReactNode;
}

export const ChartContainer = ({ title, appLink, children }: Props) => {
  return (
    <EuiAccordion
      initialIsOpen
      id={title}
      buttonContentClassName="accordion-button"
      buttonContent={
        <EuiTitle size="xs">
          <h5>{title}</h5>
        </EuiTitle>
      }
      extraAction={
        <EuiButtonEmpty href={appLink}>
          {i18n.translate('xpack.observability.chart.viewInAppLabel', {
            defaultMessage: 'View in app',
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiPanel>{children}</EuiPanel>
    </EuiAccordion>
  );
};
