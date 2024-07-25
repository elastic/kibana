/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function CreateEntityDefinitionBtn() {
  return (
    <EuiButton color="primary" data-test-subj="entityManagerCreateDefinitionButton" fill>
      {i18n.translate('xpack.entityManager.createEntityDefinitionBtn.label', {
        defaultMessage: 'Create Definition',
      })}
    </EuiButton>
  );
}
