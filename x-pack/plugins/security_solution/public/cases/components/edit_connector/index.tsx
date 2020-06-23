/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import * as i18n from '../../translations';
import { Form, UseField, useForm } from '../../../shared_imports';
import { schema } from './schema';
import { ConnectorSelector } from '../connector_selector/form';
import { Connector } from '../../../../../case/common/api/cases';

interface EditConnectorProps {
  connectors: Connector[];
  disabled?: boolean;
  isLoading: boolean;
  onSubmit: (a: string[]) => void;
  selectedConnector: string;
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
    p {
      font-size: ${theme.eui.euiSizeM};
    }
  `}
`;

export const EditConnector = React.memo(
  ({
    connectors,
    disabled = false,
    isLoading,
    onSubmit,
    selectedConnector,
  }: EditConnectorProps) => {
    const { form } = useForm({
      defaultValue: { connectors },
      options: { stripEmptyFields: false },
      schema,
    });
    const [connectorHasChanged, setConnectorHasChanged] = useState(false);
    const onChangeConnector = useCallback(
      (connectorId) => {
        setConnectorHasChanged(selectedConnector !== connectorId);
      },
      [selectedConnector]
    );

    const onCancelConnector = useCallback(() => {
      form.setFieldValue('connector', selectedConnector);
      setConnectorHasChanged(false);
    }, [form, selectedConnector]);

    const onSubmitConnector = useCallback(async () => {
      const { isValid, data: newData } = await form.submit();
      if (isValid && newData.connector) {
        onSubmit(newData.connector);
        setConnectorHasChanged(false);
      }
    }, [form, onSubmit]);
    return (
      <EuiText>
        <MyFlexGroup alignItems="center" gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <h4>{i18n.CONNECTORS}</h4>
          </EuiFlexItem>
          {isLoading && <EuiLoadingSpinner data-test-subj="connector-loading" />}
        </MyFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <MyFlexGroup gutterSize="xs">
          <EuiFlexGroup data-test-subj="edit-connectors" direction="column">
            <EuiFlexItem>
              <Form form={form}>
                <EuiFlexGroup gutterSize="none" direction="row">
                  <EuiFlexItem>
                    <UseField
                      path="connector"
                      component={ConnectorSelector}
                      componentProps={{
                        connectors,
                        dataTestSubj: 'caseConnectors',
                        idAria: 'caseConnectors',
                        isLoading,
                        disabled,
                        defaultValue: selectedConnector,
                      }}
                      onChange={onChangeConnector}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Form>
            </EuiFlexItem>
            {connectorHasChanged && (
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="secondary"
                      data-test-subj="edit-connectors-submit"
                      fill
                      iconType="save"
                      onClick={onSubmitConnector}
                      size="s"
                    >
                      {i18n.SAVE}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="edit-connectors-cancel"
                      iconType="cross"
                      onClick={onCancelConnector}
                      size="s"
                    >
                      {i18n.CANCEL}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </MyFlexGroup>
      </EuiText>
    );
  }
);

EditConnector.displayName = 'EditConnector';
