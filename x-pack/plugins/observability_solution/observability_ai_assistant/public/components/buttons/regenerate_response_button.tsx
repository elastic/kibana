/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonEmptyProps } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function RegenerateResponseButton(props: Partial<EuiButtonEmptyProps>) {
  return (
    <EuiButtonEmpty
      size="s"
      data-test-subj="observabilityAiAssistantRegenerateResponseButton"
      iconType="sparkles"
      {...props}
    >
      {i18n.translate('xpack.observabilityAiAssistant.regenerateResponseButtonLabel', {
        defaultMessage: 'Regenerate',
      })}
    </EuiButtonEmpty>
  );
}
