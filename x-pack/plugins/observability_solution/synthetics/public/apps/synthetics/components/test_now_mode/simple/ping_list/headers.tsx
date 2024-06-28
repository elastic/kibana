/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PingHeaders as HeadersProp } from '../../../../../../../common/runtime_types';

interface Props {
  headers: HeadersProp;
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
        id="responseHeaderAccord"
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.synthetics.pingList.headers.title', {
                defaultMessage: 'Response headers',
              })}
            </h3>
          </EuiTitle>
        }
      >
        <EuiSpacer size="s" />
        <EuiDescriptionList compressed={true} type="responsiveColumn" listItems={headersList} />
      </EuiAccordion>
    </>
  );
};
