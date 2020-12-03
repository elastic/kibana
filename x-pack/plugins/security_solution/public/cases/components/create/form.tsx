/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, EuiSteps } from '@elastic/eui';
import styled, { css } from 'styled-components';

import { useFormContext } from '../../../shared_imports';

import { Title } from './title';
import { Description } from './description';
import { Tags } from './tags';
import { Connector } from './connector';
import * as i18n from './translations';

interface ContainerProps {
  big?: boolean;
}

const Container = styled.div.attrs((props) => props)<ContainerProps>`
  ${({ big, theme }) => css`
    margin-top: ${big ? theme.eui?.euiSizeXL ?? '32px' : theme.eui?.euiSize ?? '16px'};
  `}
`;

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 99;
`;

interface Props {
  withSteps?: boolean;
}

export const CreateCaseForm: React.FC<Props> = React.memo(({ withSteps = true }) => {
  const { isSubmitting } = useFormContext();

  const firstStep = useMemo(
    () => ({
      title: i18n.STEP_ONE_TITLE,
      children: (
        <>
          <Title isLoading={isSubmitting} />
          <Container>
            <Tags isLoading={isSubmitting} />
          </Container>
          <Container big>
            <Description isLoading={isSubmitting} />
          </Container>
        </>
      ),
    }),
    [isSubmitting]
  );

  const secondStep = useMemo(
    () => ({
      title: i18n.STEP_TWO_TITLE,
      children: (
        <Container>
          <Connector isLoading={isSubmitting} />
        </Container>
      ),
    }),
    [isSubmitting]
  );

  const allSteps = useMemo(() => [firstStep, secondStep], [firstStep, secondStep]);

  return (
    <>
      {isSubmitting && <MySpinner data-test-subj="create-case-loading-spinner" size="xl" />}
      {withSteps ? (
        <EuiSteps
          headingElement="h2"
          steps={allSteps}
          data-test-subj={'case-creation-form-steps'}
        />
      ) : (
        <>
          {firstStep.children}
          {secondStep.children}
        </>
      )}
    </>
  );
});

CreateCaseForm.displayName = 'CreateCaseForm';
