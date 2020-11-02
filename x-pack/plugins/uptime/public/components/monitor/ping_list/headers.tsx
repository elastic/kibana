/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiAccordion, EuiDescriptionList, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  headers: Record<string, string>;
}

export const PingHeaders = ({ headers }: Props) => {
  const headersList = Object.keys(headers)
    .sort()
    .map((header) => ({
      title: header,
      description: headers[header],
    }));

  return (
    <>
      <EuiSpacer size="s" />
      <EuiAccordion
        id="accordion1"
        buttonContent={
          <EuiText size="xs">
            <h3>
              {i18n.translate('xpack.uptime.pingList.headers.title', {
                defaultMessage: 'Response headers',
              })}
            </h3>
          </EuiText>
        }
      >
        <EuiPanel>
          <EuiDescriptionList compressed={true} type="responsiveColumn" listItems={headersList} />
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
