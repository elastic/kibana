/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiFieldText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';
import type { ServiceMapEmbeddableState } from './types';

export interface ServiceMapEditorFlyoutProps {
  onCancel: () => void;
  onSave: (state: ServiceMapEmbeddableState) => void;
  initialState?: ServiceMapEmbeddableState;
  ariaLabelledBy: string;
}

const ENVIRONMENT_OPTIONS = [
  {
    value: ENVIRONMENT_ALL.value,
    text: i18n.translate('xpack.apm.serviceMapEditor.allEnvironmentsOption', {
      defaultMessage: 'All environments',
    }),
  },
  {
    value: ENVIRONMENT_NOT_DEFINED.value,
    text: i18n.translate('xpack.apm.serviceMapEditor.notDefinedEnvironmentOption', {
      defaultMessage: 'Not defined',
    }),
  },
];

export function ServiceMapEditorFlyout({
  onCancel,
  onSave,
  initialState,
  ariaLabelledBy,
}: ServiceMapEditorFlyoutProps) {
  const isEditing = !!initialState;

  const [environment, setEnvironment] = useState<Environment>(
    initialState?.environment ?? ENVIRONMENT_ALL.value
  );
  const [kuery, setKuery] = useState(initialState?.kuery ?? '');
  const [serviceName, setServiceName] = useState(initialState?.serviceName ?? '');

  const handleSave = useCallback(() => {
    const state: ServiceMapEmbeddableState = {
      environment,
      kuery,
      serviceName: serviceName || undefined,
    };
    onSave(state);
  }, [environment, kuery, serviceName, onSave]);

  return (
    <>
      <EuiFlyoutHeader hasBorder data-test-subj="apmServiceMapEditorFlyout">
        <EuiTitle size="s">
          <h2 id={ariaLabelledBy}>
            {isEditing ? (
              <FormattedMessage
                id="xpack.apm.serviceMapEditor.editTitle"
                defaultMessage="Edit service map"
              />
            ) : (
              <FormattedMessage
                id="xpack.apm.serviceMapEditor.addTitle"
                defaultMessage="Add service map panel"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.serviceNameLabel', {
              defaultMessage: 'Service name (optional)',
            })}
            helpText={i18n.translate('xpack.apm.serviceMapEditor.serviceNameHelpText', {
              defaultMessage: 'Filter to show only a specific service and its connections',
            })}
            fullWidth
          >
            <EuiFieldText
              compressed
              fullWidth
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder={i18n.translate('xpack.apm.serviceMapEditor.serviceNamePlaceholder', {
                defaultMessage: 'e.g., my-service',
              })}
              data-test-subj="apmServiceMapEditorServiceNameInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.environmentLabel', {
              defaultMessage: 'Environment',
            })}
            fullWidth
          >
            <EuiSelect
              compressed
              fullWidth
              options={ENVIRONMENT_OPTIONS}
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as Environment)}
              data-test-subj="apmServiceMapEditorEnvironmentSelect"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.kueryLabel', {
              defaultMessage: 'KQL filter (optional)',
            })}
            helpText={i18n.translate('xpack.apm.serviceMapEditor.kueryHelpText', {
              defaultMessage: 'Additional filter using KQL syntax',
            })}
            fullWidth
          >
            <EuiFieldText
              compressed
              fullWidth
              value={kuery}
              onChange={(e) => setKuery(e.target.value)}
              placeholder={i18n.translate('xpack.apm.serviceMapEditor.kueryPlaceholder', {
                defaultMessage: 'e.g., service.environment: production',
              })}
              data-test-subj="apmServiceMapEditorKueryInput"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              flush="left"
              data-test-subj="apmServiceMapEditorCancelButton"
            >
              <FormattedMessage
                id="xpack.apm.serviceMapEditor.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleSave} fill data-test-subj="apmServiceMapEditorSaveButton">
              {isEditing ? (
                <FormattedMessage
                  id="xpack.apm.serviceMapEditor.saveButton"
                  defaultMessage="Save"
                />
              ) : (
                <FormattedMessage
                  id="xpack.apm.serviceMapEditor.addButton"
                  defaultMessage="Add panel"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
