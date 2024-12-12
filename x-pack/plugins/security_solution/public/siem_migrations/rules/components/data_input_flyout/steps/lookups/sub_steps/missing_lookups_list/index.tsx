/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { MissingLookupsList } from './missing_lookups_list';
import * as i18n from './translations';

export interface MissingLookupsListStepProps {
  status: EuiStepStatus;
  onCopied: () => void;
  missingLookups: string[];
  uploadedLookups: Record<string, true>;
}
export const useMissingLookupsListStep = ({
  status,
  onCopied,
  missingLookups,
  uploadedLookups,
}: MissingLookupsListStepProps): EuiStepProps => {
  return {
    title: i18n.LOOKUPS_DATA_INPUT_COPY_TITLE,
    status,
    children: (
      <MissingLookupsList
        onCopied={onCopied}
        missingLookups={missingLookups}
        uploadedLookups={uploadedLookups}
      />
    ),
  };
};
