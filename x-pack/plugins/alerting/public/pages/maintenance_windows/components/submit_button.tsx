/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../translations';

export const SubmitButton: React.FC = React.memo(() => {
  const { submit, isSubmitting } = useFormContext();

  return (
    <EuiButton
      data-test-subj="create-submit"
      fill
      isDisabled={isSubmitting}
      isLoading={isSubmitting}
      onClick={submit}
    >
      {i18n.CREATE_MAINTENANCE_WINDOW}
    </EuiButton>
  );
});
SubmitButton.displayName = 'SubmitButton';
