/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, EuiSteps } from '@elastic/eui';
import styled, { css } from 'styled-components';

import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { normalizeCaseConnector } from '../configure_cases/utils';

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
  const { loading: isLoadingConnectors, connectors } = useConnectors();
  const { connector: configureConnector, loading: isLoadingCaseConfigure } = useCaseConfigure();

  // const { isLoading, postCase } = usePostCase();
  const isLoading = false;

  const currentConnectorId = useMemo(
    () =>
      !isLoadingCaseConfigure
        ? normalizeCaseConnector(connectors, configureConnector)?.id ?? 'none'
        : null,
    [configureConnector, connectors, isLoadingCaseConfigure]
  );

  const firstStep = useMemo(
    () => ({
      title: i18n.STEP_ONE_TITLE,
      children: (
        <>
          <Title isLoading={isLoading} />
          <Container>
            <Tags isLoading={isLoading} />
          </Container>
          <Container big>
            <Description isLoading={isLoading} />
          </Container>
        </>
      ),
    }),
    [isLoading]
  );

  const secondStep = useMemo(
    () => ({
      title: i18n.STEP_TWO_TITLE,
      children: (
        <Container>
          <Connector
            connectors={connectors}
            currentConnectorId={currentConnectorId}
            isLoading={isLoading || isLoadingConnectors || isLoadingCaseConfigure}
          />
        </Container>
      ),
    }),
    [connectors, currentConnectorId, isLoading, isLoadingConnectors, isLoadingCaseConfigure]
  );

  const allSteps = useMemo(() => [firstStep, secondStep], [firstStep, secondStep]);

  return (
    <>
      {isLoading && <MySpinner data-test-subj="create-case-loading-spinner" size="xl" />}
      {withSteps ? (
        <EuiSteps headingElement="h2" steps={allSteps} />
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
