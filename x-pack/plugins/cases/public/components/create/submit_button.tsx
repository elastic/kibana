/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton } from '@elastic/eui';

import { useFormContext } from '../../common/shared_imports';
import * as i18n from './translations';

const SubmitCaseButtonComponent: React.FC = () => {
  const { submit, isSubmitting } = useFormContext();

  return (
    <EuiButton
      data-test-subj="create-case-submit"
      fill
      iconType="plusInCircle"
      isDisabled={isSubmitting}
      isLoading={isSubmitting}
      onClick={submit}
    >
      {i18n.CREATE_CASE}
    </EuiButton>
  );
};
SubmitCaseButtonComponent.displayName = 'SubmitCaseButton';

export const SubmitCaseButton = memo(SubmitCaseButtonComponent);
