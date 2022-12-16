/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHighlight, EuiText } from '@elastic/eui';

/** Renders a field name in it's non-dragging state */
export const FieldName = React.memo<{
  fieldId: string;
  highlight?: string;
}>(({ fieldId, highlight = '' }) => {
  return (
    <EuiText size="xs">
      <EuiHighlight data-test-subj={`field-${fieldId}-name`} search={highlight}>
        {fieldId}
      </EuiHighlight>
    </EuiText>
  );
});

FieldName.displayName = 'FieldName';
