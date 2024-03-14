/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useObservabilityRouter } from '../../../../../../hooks/use_router';
import { useCapabilities } from '../../../../hooks/slo/use_capabilities';

export function CreateSloBtn() {
  const { push } = useObservabilityRouter();

  const { hasWriteCapabilities } = useCapabilities();

  const handleClickCreateSlo = () => {
    push('/slos/create', { path: '', query: {} });
  };

  return (
    <EuiButton
      color="primary"
      data-test-subj="slosPageCreateNewSloButton"
      disabled={!hasWriteCapabilities}
      fill
      onClick={handleClickCreateSlo}
    >
      {i18n.translate('xpack.observability.slo.sloList.pageHeader.create', {
        defaultMessage: 'Create SLO',
      })}
    </EuiButton>
  );
}
