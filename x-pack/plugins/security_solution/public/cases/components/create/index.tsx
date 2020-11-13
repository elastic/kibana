/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import styled, { css } from 'styled-components';
import { useHistory } from 'react-router-dom';

import { Field, getUseField, useFormContext } from '../../../shared_imports';
import { usePostCase } from '../../containers/use_post_case';
import { getCaseDetailsUrl } from '../../../common/components/link_to';
import * as i18n from './translations';
import { CreateCaseForm } from './form';
import { FormContext } from './form_context';

export const CommonUseField = getUseField({ component: Field });

interface ContainerProps {
  big?: boolean;
}

const Container = styled.div.attrs((props) => props)<ContainerProps>`
  ${({ big, theme }) => css`
    margin-top: ${big ? theme.eui.euiSizeXL : theme.eui.euiSize};
  `}
`;

const SubmitButton = () => {
  const { submit } = useFormContext();

  return (
    <EuiButton
      data-test-subj="create-case-submit"
      fill
      iconType="plusInCircle"
      // isDisabled={isLoading}
      // isLoading={isLoading}
      onClick={submit}
    >
      {i18n.CREATE_CASE}
    </EuiButton>
  );
};

export const Create = React.memo(() => {
  const history = useHistory();

  const onSuccess = useCallback(
    ({ id }) => {
      history.push(getCaseDetailsUrl({ id }));
    },
    [history]
  );

  const handleSetIsCancel = useCallback(() => {
    history.push('/');
  }, [history]);

  return (
    <EuiPanel>
      <FormContext onSuccess={onSuccess}>
        <CreateCaseForm />
        <Container>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="create-case-cancel"
                size="s"
                onClick={handleSetIsCancel}
                iconType="cross"
              >
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SubmitButton />
              {/* <EuiButton
                data-test-subj="create-case-submit"
                fill
                iconType="plusInCircle"
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={onSubmit}
              >
                {i18n.CREATE_CASE}
              </EuiButton> */}
            </EuiFlexItem>
          </EuiFlexGroup>
        </Container>
      </FormContext>
    </EuiPanel>
  );
});

Create.displayName = 'Create';
