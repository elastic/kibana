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
  EuiButtonIcon,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { noop } from 'lodash/fp';

import { Form, UseField, useForm, useFormData } from '../../../shared_imports';
import { ConnectorSelector } from '../connector_selector/form';
import { ActionConnector } from '../../../../../case/common/api/cases';
import { ConnectorTypeFields } from '../../../../../case/common/api/connectors';
import { SettingFieldsForm } from '../settings/fields_form';
import { getConnectorById } from '../configure_cases/utils';
import { CaseUserActions } from '../../containers/types';
import { schema } from './schema';
import { getConnectorFieldsFromUserActions } from './helpers';

import * as i18n from './translations';

interface EditConnectorProps {
  caseFields: ConnectorTypeFields['fields'];
  connectors: ActionConnector[];
  disabled?: boolean;
  isLoading: boolean;
  onSubmit: (
    connectorId: string,
    connectorFields: ConnectorTypeFields['fields'],
    onSuccess: () => void,
    onError: () => void
  ) => void;
  selectedConnector: string;
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

const DisappearingFlexItem = styled(EuiFlexItem)`
  ${({ $isHidden }: { $isHidden: boolean }) =>
    $isHidden &&
    css`
      margin: 0 !important;
    `}
`;

export const EditConnector = React.memo(
  ({
    caseFields,
    connectors,
    disabled = false,
    isLoading,
    onSubmit,
    selectedConnector,
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

    const [actionConnector, setActionConnector] = useState<ActionConnector | null>(
      getConnectorById(connectorId, connectors)
    );
    const [fields, setFields] = useState<ConnectorTypeFields['fields']>(caseFields);
    const [editConnector, setEditConnector] = useState(false);

    const onChangeConnector = useCallback(
      (newConnectorId) => {
        if (selectedConnector === newConnectorId) {
          setFields(caseFields);
        }
      },
      [selectedConnector, caseFields]
    );

    const onFields = useCallback(
      (newFields) => {
        console.log('is this gonna get called edit_connector???', { newFields, caseFields });
        if (!deepEqual(newFields, caseFields)) {
          setFields(newFields);
        }
      },
      [caseFields]
    );

    const onError = useCallback(() => {
      setFieldValue('connectorId', selectedConnector);
      setEditConnector(false);
    }, [setFieldValue, selectedConnector]);

    const onCancelConnector = useCallback(() => {
      setFieldValue('connectorId', selectedConnector);
      setFields(caseFields);
      setEditConnector(false);
    }, [selectedConnector, setFieldValue, caseFields]);

    const onSubmitConnector = useCallback(async () => {
      const { isValid, data: newData } = await submit();
      if (isValid && newData.connectorId) {
        onSubmit(newData.connectorId, fields, onError, noop);
        setEditConnector(false);
      }
    }, [submit, fields, onSubmit, onError]);

    const onConnectorChange = useCallback(() => {
      const condition1 = Object.keys(userActions).length > 0 && connectorId !== selectedConnector;
      console.log('setFields', {
        condition1,
        connectorId,
        selectedConnector,
        userActions: getConnectorFieldsFromUserActions(connectorId, userActions),
      });
      if (condition1) {
        setFields(getConnectorFieldsFromUserActions(connectorId, userActions));
      }
      const condition =
        connectorId != null &&
        connectors.length > 0 &&
        (actionConnector == null || actionConnector.id !== connectorId);
      console.log('setActionConnector', {
        actionConnector,
        connectorId,
        connectors,
        condition,
        selectedConnector,
      });
      if (condition) {
        setActionConnector(getConnectorById(connectorId, connectors));
      }
    }, [actionConnector, connectorId, connectors, selectedConnector, userActions]);

    useEffect(() => {
      onConnectorChange();
    }, [connectorId, connectors, selectedConnector, userActions]);

    console.log('edit_connector fields', fields);
    const onEditClick = useCallback(() => setEditConnector(true), []);
    return (
      <EuiText>
        <MyFlexGroup alignItems="center" gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <h4>{i18n.CONNECTORS}</h4>
          </EuiFlexItem>
          {isLoading && <EuiLoadingSpinner data-test-subj="connector-loading" />}
          {!isLoading && !editConnector && (
            <EuiFlexItem data-test-subj="connector-edit" grow={false}>
              <EuiButtonIcon
                aria-label={i18n.EDIT_CONNECTOR_ARIA}
                data-test-subj="connector-edit-button"
                iconType={'pencil'}
                isDisabled={disabled}
                onClick={onEditClick}
              />
            </EuiFlexItem>
          )}
        </MyFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <MyFlexGroup gutterSize="none">
          <EuiFlexGroup data-test-subj="edit-connectors" direction="column">
            <DisappearingFlexItem $isHidden={!editConnector}>
              <Form form={form}>
                <EuiFlexGroup gutterSize="none" direction="row">
                  <EuiFlexItem>
                    <UseField
                      path="connectorId"
                      component={ConnectorSelector}
                      componentProps={{
                        connectors,
                        dataTestSubj: 'caseConnectors',
                        defaultValue: selectedConnector,
                        disabled,
                        idAria: 'caseConnectors',
                        isEdit: editConnector,
                        isLoading,
                      }}
                      onChange={onChangeConnector}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Form>
            </DisappearingFlexItem>
            <EuiFlexItem>
              <SettingFieldsForm
                connector={actionConnector}
                fields={fields}
                isEdit={editConnector}
                onFieldsChange={onFields}
              />
            </EuiFlexItem>
            {editConnector && (
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
