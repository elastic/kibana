/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useInvestigation } from '../../contexts/investigation_context';

export function ExternalIncidentButton() {
  const { investigation } = useInvestigation();

  if (!investigation?.externalIncidentUrl) {
    return null;
  }

  return (
    <EuiButtonEmpty
      data-test-subj="externalIncidentHeaderButton"
      iconType="link"
      size="xs"
      href={investigation.externalIncidentUrl}
      target="_blank"
    >
      <EuiText size="s">
        {i18n.translate('xpack.investigateApp.investigationHeader.externalIncidentTextLabel', {
          defaultMessage: 'External incident',
        })}
      </EuiText>
    </EuiButtonEmpty>
  );
}
