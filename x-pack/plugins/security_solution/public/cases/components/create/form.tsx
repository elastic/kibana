/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiLoadingSpinner, EuiSteps } from '@elastic/eui';
import styled, { css } from 'styled-components';

import { Form, useForm } from '../../../shared_imports';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import {
  normalizeCaseConnector,
  getConnectorById,
  getNoneConnector,
  normalizeActionConnector,
} from '../configure_cases/utils';
import { ActionConnector } from '../../containers/types';
import { usePostCase } from '../../containers/use_post_case';
import { ConnectorFields } from '../../../../../case/common/api/connectors';

import { schema, FormProps } from './schema';
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

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
};

export const CreateCaseForm: React.FC<Props> = React.memo(({ withSteps = true }) => {
  const { loading: isLoadingConnectors, connectors } = useConnectors();
  const { connector: configureConnector, loading: isLoadingCaseConfigure } = useCaseConfigure();
  const { tags: tagOptions, isLoading: isLoadingTags } = useGetTags();
  const { isLoading, postCase } = usePostCase();
  const [fields, setFields] = useState<ConnectorFields>(null);
  const [connector, setConnector] = useState<ActionConnector | null>(null);
  const [options, setOptions] = useState(
    tagOptions.map((label) => ({
      label,
    }))
  );

  const { form } = useForm<FormProps>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
  });

  const submitCase = useCallback(async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      const { connectorId: dataConnectorId, ...dataWithoutConnectorId } = data;
      const caseConnector = getConnectorById(dataConnectorId, connectors);
      const connectorToUpdate = caseConnector
        ? normalizeActionConnector(caseConnector, fields)
        : getNoneConnector();

      await postCase({ ...dataWithoutConnectorId, connector: connectorToUpdate });
    }
  }, [postCase, fields, connectors, form]);

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
        setFields(null);
      }
    },
    [connector, connectors]
  );

  const firstStep = useMemo(
    () => ({
      title: i18n.STEP_ONE_TITLE,
      children: (
        <>
          <Title isLoading={isLoading} />
          <Container>
            <Tags
              isLoading={isLoading || isLoadingTags}
              options={options}
              setOptions={setOptions}
            />
          </Container>
          <Container big>
            <Description isLoading={isLoading} />
          </Container>
        </>
      ),
    }),
    [isLoading, options, isLoadingTags]
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
            isLoading={isLoading || isLoadingConnectors || isLoadingCaseConfigure}
            onChangeConnector={onChangeConnector}
            onChangeFields={setFields}
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
      isLoadingCaseConfigure,
      onChangeConnector,
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
            {firstStep.children}
            {secondStep.children}
          </>
        )}
      </Form>
    </>
  );
});

CreateCaseForm.displayName = 'CreateCaseForm';
