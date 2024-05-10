/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../../../utils/kibana_react';
import { paths } from '../../../../../common/locators/paths';
import { useCapabilities } from '../../../../hooks/use_capabilities';

export function CreateSloBtn() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const { hasWriteCapabilities } = useCapabilities();

  const handleClickCreateSlo = () => {
    navigateToUrl(basePath.prepend(paths.sloCreate));
  };
  return (
    <EuiButton
      color="primary"
      data-test-subj="slosPageCreateNewSloButton"
      disabled={!hasWriteCapabilities}
      fill
      onClick={handleClickCreateSlo}
    >
      {i18n.translate('xpack.slo.sloList.pageHeader.create', { defaultMessage: 'Create SLO' })}
    </EuiButton>
  );
}
