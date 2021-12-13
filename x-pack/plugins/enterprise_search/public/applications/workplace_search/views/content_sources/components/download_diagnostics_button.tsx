/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton } from '@elastic/eui';

import { HttpLogic } from '../../../../shared/http';
import { AppLogic } from '../../../app_logic';

import { SourceLogic } from '../source_logic';

interface Props {
  label: string;
}

export const DownloadDiagnosticsButton: React.FC<Props> = ({ label }) => {
  const { http } = useValues(HttpLogic);
  const { isOrganization } = useValues(AppLogic);
  const {
    contentSource: { id, serviceType },
    buttonLoading,
  } = useValues(SourceLogic);

  const diagnosticsPath = isOrganization
    ? http.basePath.prepend(`/internal/workplace_search/org/sources/${id}/download_diagnostics`)
    : http.basePath.prepend(
        `/internal/workplace_search/account/sources/${id}/download_diagnostics`
      );

  return (
    <EuiButton
      target="_blank"
      href={diagnosticsPath}
      isLoading={buttonLoading}
      data-test-subj="DownloadDiagnosticsButton"
      download={`${id}_${serviceType}_${Date.now()}_diagnostics.json`}
    >
      {label}
    </EuiButton>
  );
};
