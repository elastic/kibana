/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner, EuiSteps } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { useFormContext } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/form_context';
import type { ActionConnector } from '../../../common/api/connectors';
import { Connector } from './connector';
import { Description } from './description';
import { SyncAlertsToggle } from './sync_alerts_toggle';
import { Tags } from './tags';
import { Title } from './title';
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
  connectors?: ActionConnector[];
  disableAlerts?: boolean;
  hideConnectorServiceNowSir?: boolean;
  isLoadingConnectors?: boolean;
  withSteps?: boolean;
}
const empty: ActionConnector[] = [];
export const CreateCaseForm: React.FC<Props> = React.memo(
  ({
    connectors = empty,
    disableAlerts = false,
    isLoadingConnectors = false,
    hideConnectorServiceNowSir = false,
    withSteps = true,
  }) => {
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
            <SyncAlertsToggle isLoading={isSubmitting} />
          </Container>
        ),
      }),
      [isSubmitting]
    );

    const thirdStep = useMemo(
      () => ({
        title: i18n.STEP_THREE_TITLE,
        children: (
          <Container>
            <Connector
              connectors={connectors}
              hideConnectorServiceNowSir={hideConnectorServiceNowSir}
              isLoadingConnectors={isLoadingConnectors}
              isLoading={isSubmitting}
            />
          </Container>
        ),
      }),
      [connectors, hideConnectorServiceNowSir, isLoadingConnectors, isSubmitting]
    );

    const allSteps = useMemo(
      () => [firstStep, ...(!disableAlerts ? [secondStep] : []), thirdStep],
      [disableAlerts, firstStep, secondStep, thirdStep]
    );

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
            {!disableAlerts && secondStep.children}
            {thirdStep.children}
          </>
        )}
      </>
    );
  }
);

CreateCaseForm.displayName = 'CreateCaseForm';
