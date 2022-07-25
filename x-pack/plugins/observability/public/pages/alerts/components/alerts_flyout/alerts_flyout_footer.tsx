/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FlyoutProps } from './types';
import { translations } from '../../../../config';

// eslint-disable-next-line import/no-default-export
export default function AlertsFlyoutFooter({ alert, isInApp }: FlyoutProps & { isInApp: boolean }) {
  const { services } = useKibana();
  const { http } = services;
  const prepend = http?.basePath.prepend;

  if (!alert.link || isInApp) return <></>;
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            href={prepend && prepend(alert.link)}
            data-test-subj="alertsFlyoutViewInAppButton"
            fill
          >
            {translations.alertsFlyout.viewInAppButtonText}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
