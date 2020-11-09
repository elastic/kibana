/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import styled, { css } from 'styled-components';
import { useHistory } from 'react-router-dom';

import { Field, getUseField, useForm } from '../../../shared_imports';
import { usePostCase } from '../../containers/use_post_case';
import { schema, FormProps } from './schema';
import { getCaseDetailsUrl } from '../../../common/components/link_to';
import { useConnectors } from '../../containers/configure/use_connectors';
import {
  getConnectorById,
  getNoneConnector,
  normalizeActionConnector,
} from '../configure_cases/utils';
import { ConnectorFields } from '../../../../../case/common/api/connectors';
import * as i18n from './translations';
import { CreateCaseForm } from './form';

export const CommonUseField = getUseField({ component: Field });

interface ContainerProps {
  big?: boolean;
}

const Container = styled.div.attrs((props) => props)<ContainerProps>`
  ${({ big, theme }) => css`
    margin-top: ${big ? theme.eui.euiSizeXL : theme.eui.euiSize};
  `}
`;

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
};

export const Create = React.memo(() => {
  const history = useHistory();
  const { caseData, isLoading, postCase } = usePostCase();
  const { connectors } = useConnectors();
  const [fields, setFields] = useState<ConnectorFields>(null);

  const { form } = useForm<FormProps>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
  });

  const { submit } = form;

  const onSubmit = useCallback(async () => {
    const { isValid, data } = await submit();
    if (isValid) {
      const { connectorId: dataConnectorId, ...dataWithoutConnectorId } = data;
      const caseConnector = getConnectorById(dataConnectorId, connectors);
      const connectorToUpdate = caseConnector
        ? normalizeActionConnector(caseConnector, fields)
        : getNoneConnector();

      await postCase({ ...dataWithoutConnectorId, connector: connectorToUpdate });
    }
  }, [submit, postCase, fields, connectors]);

  const handleSetIsCancel = useCallback(() => {
    history.push('/');
  }, [history]);

  if (caseData != null && caseData.id) {
    history.push(getCaseDetailsUrl({ id: caseData.id }));
    return null;
  }

  return (
    <EuiPanel>
      <CreateCaseForm form={form} fields={fields} onChangeFields={setFields} />
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
            <EuiButton
              data-test-subj="create-case-submit"
              fill
              iconType="plusInCircle"
              isDisabled={isLoading}
              isLoading={isLoading}
              onClick={onSubmit}
            >
              {i18n.CREATE_CASE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Container>
    </EuiPanel>
  );
});

Create.displayName = 'Create';
