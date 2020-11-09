/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ConnectorFields } from '../../../../../../case/common/api/connectors';
import { useForm, useFormData } from '../../../../shared_imports';
import { usePostCase } from '../../../containers/use_post_case';
import { FormProps, schema } from '../../create/schema';
import { CreateCaseForm } from '../../create/form';
import {
  getConnectorById,
  normalizeActionConnector,
  getNoneConnector,
} from '../../configure_cases/utils';
import { useConnectors } from '../../../containers/configure/use_connectors';

import * as i18n from './translations';

interface CreateCaseProps {
  onCaseCreated: (id: string) => void;
}

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
};

const ButtonWrapper = styled(EuiFlexGroup)`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSize};
  `}
`;

const CreateCaseComponent: React.FC<CreateCaseProps> = ({ onCaseCreated }) => {
  const { connectors } = useConnectors();
  const { caseData, isLoading, postCase } = usePostCase();
  const [fields, setFields] = useState<ConnectorFields>(null);
  const { form } = useForm<FormProps>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
  });

  const { submit } = form;

  // const [{ title, tags, description, connectorId }, serializer, isMounted] = useFormData<{
  //   title: string;
  //   description: string;
  //   tags: string[];
  //   connectorId: string;
  // }>({
  //   form,
  //   watch: ['title', 'tags', 'description', 'connectorId'],
  // });

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
  }, [submit, fields, connectors, postCase]);

  useEffect(() => {
    if (caseData) {
      onCaseCreated(caseData?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData]);

  return (
    <>
      <CreateCaseForm
        isLoading={isLoading}
        form={form}
        fields={fields}
        onChangeFields={setFields}
        withSteps={false}
      />
      <ButtonWrapper>
        <EuiFlexItem>
          <EuiButton
            data-test-subj="create-case-submit"
            iconType="plusInCircle"
            onClick={onSubmit}
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {i18n.CREATE_CASE}
          </EuiButton>
        </EuiFlexItem>
      </ButtonWrapper>
    </>
  );
};

export const CreateCase = memo(CreateCaseComponent);
