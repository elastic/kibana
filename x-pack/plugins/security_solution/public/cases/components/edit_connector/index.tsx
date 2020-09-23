/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useEffect } from 'react';
import deepEqual from 'fast-deep-equal';
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
import { noop } from 'lodash/fp';

import * as i18n from '../../translations';
import { Form, UseField, useForm, useFormData } from '../../../shared_imports';
import { ConnectorSelector } from '../connector_selector/form';
import { ActionConnector } from '../../../../../case/common/api/cases';
import { SettingFieldsForm } from '../settings/fields_form';
import { getConnectorById } from '../configure_cases/utils';
import { AllSettingFields } from '../settings/types';
import { CaseUserActions } from '../../containers/types';
import { schema } from './schema';
import { getConnectorFieldsFromUserActions } from './helpers';

interface EditConnectorProps {
  connectors: ActionConnector[];
  disabled?: boolean;
  isLoading: boolean;
  selectedConnector: string;
  onSubmit: (
    connectorId: string,
    connectorFields: Record<string, AllSettingFields>,
    onSuccess: () => void,
    onError: () => void
  ) => void;
  caseFields: Record<string, AllSettingFields>;
  userActions: CaseUserActions[];
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
    caseFields,
    userActions,
  }: EditConnectorProps) => {
    const { form } = useForm({
      defaultValue: { connectorId: selectedConnector },
      options: { stripEmptyFields: false },
      schema,
    });

    const { setFieldValue, submit } = form;
    const [{ connectorId }] = useFormData<{
      connectorId: string;
    }>({
      form,
      watch: ['connectorId', 'description'],
    });

    const [settingsHasChanged, setSettingsHasChanged] = useState(false);
    const [actionConnector, setActionConnector] = useState<ActionConnector | null>(null);
    const [fields, setFields] = useState<Record<string, AllSettingFields>>(caseFields);

    const onChangeConnector = useCallback(
      (newConnectorId) => {
        if (selectedConnector === newConnectorId) {
          setFields(caseFields);
        }

        setSettingsHasChanged(selectedConnector !== newConnectorId);
      },
      [selectedConnector, caseFields]
    );

    const onFields = useCallback(
      (newFields) => {
        if (!deepEqual(newFields, caseFields)) {
          setSettingsHasChanged(true);
          setFields(newFields);
        }
      },
      [caseFields]
    );

    const onError = useCallback(() => {
      setFieldValue('connectorId', selectedConnector);
      setSettingsHasChanged(false);
    }, [setFieldValue, selectedConnector]);

    const onCancelConnector = useCallback(() => {
      setFieldValue('connectorId', selectedConnector);
      setFields(caseFields);
      setSettingsHasChanged(false);
    }, [selectedConnector, setFieldValue, caseFields]);

    const onSubmitConnector = useCallback(async () => {
      const { isValid, data: newData } = await submit();
      if (isValid && newData.connectorId) {
        onSubmit(newData.connectorId, fields, noop, onError);
        setSettingsHasChanged(false);
      }
    }, [submit, fields, onSubmit, onError]);

    useEffect(() => {
      setActionConnector(getConnectorById(connectorId, connectors) ?? null);
    }, [connectors, connectorId]);

    useEffect(() => {
      // Get fields of the connector from user actions when changing connector
      if (connectorId && selectedConnector && selectedConnector !== connectorId) {
        setFields(getConnectorFieldsFromUserActions(connectorId, userActions));
      }
    }, [selectedConnector, connectorId, userActions]);

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
                      path="connectorId"
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
            <EuiFlexItem>
              <SettingFieldsForm
                connector={actionConnector}
                onFieldsChange={onFields}
                fields={fields}
              />
            </EuiFlexItem>
            {settingsHasChanged && (
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
