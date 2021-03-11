/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { Field, getUseField } from '../../common/shared_imports';
import * as i18n from './translations';
import { CreateCaseForm } from './form';
import { FormContext } from './form_context';
import { SubmitCaseButton } from './submit_button';
import { Case } from '../../containers/types';

export const CommonUseField = getUseField({ component: Field });

const Container = styled.div`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSize};
  `}
`;

export interface CreateCaseProps {
  onCancel: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
}

export const CreateCase = ({ onCancel, onSuccess }: CreateCaseProps) => (
  <FormContext onSuccess={onSuccess}>
    <CreateCaseForm />
    <Container>
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="create-case-cancel"
            size="s"
            onClick={onCancel}
            iconType="cross"
          >
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SubmitCaseButton />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Container>
  </FormContext>
);

// eslint-disable-next-line import/no-default-export
export { CreateCase as default };
