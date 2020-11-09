/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiLoadingSpinner, EuiSteps } from '@elastic/eui';
import styled, { css } from 'styled-components';

import { Form, FormHook } from '../../../shared_imports';
import { usePostCase } from '../../containers/use_post_case';
import { FormProps } from './schema';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { normalizeCaseConnector, getConnectorById } from '../configure_cases/utils';
import { ActionConnector } from '../../containers/types';
import { ConnectorFields } from '../../../../../case/common/api/connectors';
import * as i18n from './translations';
import { Title } from './title';
import { Description } from './description';
import { Tags } from './tags';
import { Connector } from './connector';

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
  form: FormHook<FormProps>;
  fields: ConnectorFields;
  withSteps?: boolean;
  onChangeFields: (fields: ConnectorFields) => void;
}

export const CreateCaseForm: React.FC<Props> = React.memo(
  ({ form, fields, onChangeFields, withSteps = true }) => {
    const { isLoading } = usePostCase();
    const { loading: isLoadingConnectors, connectors } = useConnectors();
    const { connector: configureConnector, loading: isLoadingCaseConfigure } = useCaseConfigure();
    const { tags: tagOptions } = useGetTags();

    const [connector, setConnector] = useState<ActionConnector | null>(null);
    const [options, setOptions] = useState(
      tagOptions.map((label) => ({
        label,
      }))
    );

    // This values uses useEffect to update, not useMemo,
    // because we need to setState on it from the jsx
    useEffect(
      () =>
        setOptions(
          tagOptions.map((label) => ({
            label,
          }))
        ),
      [tagOptions]
    );

    const currentConnectorId = useMemo(
      () =>
        !isLoadingCaseConfigure
          ? normalizeCaseConnector(connectors, configureConnector)?.id ?? 'none'
          : null,
      [configureConnector, connectors, isLoadingCaseConfigure]
    );
    const onChangeConnector = useCallback(
      (newConnectorId) => {
        if (connector == null || connector.id !== newConnectorId) {
          setConnector(getConnectorById(newConnectorId, connectors) ?? null);
          // Reset setting fields when changing connector
          onChangeFields(null);
        }
      },
      [connector, connectors, onChangeFields]
    );

    const firstStep = useMemo(
      () => ({
        title: i18n.STEP_ONE_TITLE,
        children: (
          <>
            <Title isLoading={isLoading} />
            <Container>
              <Tags isLoading={isLoading} options={options} setOptions={setOptions} />
            </Container>
            <Container big>
              <Description isLoading={isLoading} />
            </Container>
          </>
        ),
      }),
      [isLoading, options]
    );

    const secondStep = useMemo(
      () => ({
        title: i18n.STEP_TWO_TITLE,
        children: (
          <Container>
            <Connector
              connector={connector}
              connectors={connectors}
              currentConnectorId={currentConnectorId}
              fields={fields}
              isLoading={isLoading}
              isLoadingConnectors={isLoadingConnectors}
              onChangeConnector={onChangeConnector}
              onChangeFields={onChangeFields}
            />
          </Container>
        ),
      }),
      [
        connector,
        connectors,
        currentConnectorId,
        fields,
        isLoading,
        isLoadingConnectors,
        onChangeConnector,
        onChangeFields,
      ]
    );

    const allSteps = useMemo(() => [firstStep, secondStep], [firstStep, secondStep]);

    return (
      <>
        {isLoading && <MySpinner data-test-subj="create-case-loading-spinner" size="xl" />}
        <Form form={form}>
          {withSteps ? (
            <EuiSteps headingElement="h2" steps={allSteps} />
          ) : (
            <>
              <Title isLoading={isLoading} />
              <Tags isLoading={isLoading} options={options} setOptions={setOptions} />
              <Description isLoading={isLoading} />
              <Connector
                connector={connector}
                connectors={connectors}
                currentConnectorId={currentConnectorId}
                fields={fields}
                isLoading={isLoading}
                isLoadingConnectors={isLoadingConnectors}
                onChangeConnector={onChangeConnector}
                onChangeFields={onChangeFields}
              />
            </>
          )}
        </Form>
      </>
    );
  }
);

CreateCaseForm.displayName = 'CreateCaseForm';
