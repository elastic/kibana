/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiCallOut,
  EuiSpacer,
  EuiCodeBlock,
  EuiModalFooter,
  EuiAccordion,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import type { AppToast } from '.';
import * as i18n from './translations';

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
interface FullErrorProps {
  isShowing: boolean;
  toast: AppToast;
  toggle: (toast: AppToast) => void;
}

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
const ModalAllErrorsComponent: React.FC<FullErrorProps> = ({ isShowing, toast, toggle }) => {
  const handleClose = useCallback(() => toggle(toast), [toggle, toast]);

  if (!isShowing || toast == null) return null;

  return (
    <EuiModal onClose={handleClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.TITLE_ERROR_MODAL}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut title={toast.title} color="danger" size="s" iconType="alert" />
        <EuiSpacer size="s" />
        {Array.isArray(toast.errors) && // FunFact: This can be a non-array in some rare cases
          toast.errors.map((error, index) => (
            <EuiAccordion
              key={`${toast.id}-${index}`}
              id="accordion1"
              initialIsOpen={index === 0 ? true : false}
              buttonContent={error.length > 100 ? `${error.substring(0, 100)} ...` : error}
              data-test-subj="modal-all-errors-accordion"
            >
              <MyEuiCodeBlock>{error}</MyEuiCodeBlock>
            </EuiAccordion>
          ))}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={handleClose} fill data-test-subj="modal-all-errors-close">
          {i18n.CLOSE_ERROR_MODAL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
export const ModalAllErrors = React.memo(ModalAllErrorsComponent);

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
const MyEuiCodeBlock = styled(EuiCodeBlock)`
  margin-top: 4px;
`;

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
MyEuiCodeBlock.displayName = 'MyEuiCodeBlock';
