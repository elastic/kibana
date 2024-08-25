/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import {
  EuiLoadingSpinner,
  EuiSteps,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { CasePostRequest, CaseUI } from '../../../common';
import type { ActionConnector } from '../../../common/types/domain';
import { Connector } from '../case_form_fields/connector';
import * as i18n from './translations';
import { SyncAlertsToggle } from '../case_form_fields/sync_alerts_toggle';
import type { CasesConfigurationUI, CasesConfigurationUITemplate } from '../../containers/types';
import { removeEmptyFields } from '../utils';
import { useCasesFeatures } from '../../common/use_cases_features';
import { TemplateSelector } from './templates';
import { getInitialCaseValue } from './utils';
import { CaseFormFields } from '../case_form_fields';
import { builderMap as customFieldsBuilderMap } from '../custom_fields/builder';

export interface CreateCaseFormFieldsProps {
  configuration: CasesConfigurationUI;
  connectors: ActionConnector[];
  isLoading: boolean;
  withSteps: boolean;
  draftStorageKey: string;
}

const transformTemplateCaseFieldsToCaseFormFields = (
  owner: string,
  caseTemplateFields: CasesConfigurationUITemplate['caseFields']
): CasePostRequest => {
  const caseFields = removeEmptyFields(caseTemplateFields ?? {});
  const transFormedCustomFields = caseFields?.customFields?.map((customField) => {
    const customFieldFactory = customFieldsBuilderMap[customField.type];
    const { convertNullToEmpty } = customFieldFactory();
    const value = convertNullToEmpty ? convertNullToEmpty(customField.value) : customField.value;

    return {
      ...customField,
      value,
    };
  });

  return getInitialCaseValue({
    owner,
    ...caseFields,
    customFields: transFormedCustomFields as CaseUI['customFields'],
  });
};

const DEFAULT_EMPTY_TEMPLATE_KEY = 'defaultEmptyTemplateKey';

export const CreateCaseFormFields: React.FC<CreateCaseFormFieldsProps> = React.memo(
  ({ configuration, connectors, isLoading, withSteps, draftStorageKey }) => {
    const { reset, updateFieldValues, isSubmitting, setFieldValue } = useFormContext();
    const { isSyncAlertsEnabled } = useCasesFeatures();
    const configurationOwner = configuration.owner;

    /**
     * Changes the selected connector
     * when the user selects a solution.
     * Each solution has its own configuration
     * so the connector has to change.
     */
    useEffect(() => {
      setFieldValue('connectorId', configuration.connector.id);
    }, [configuration.connector.id, setFieldValue]);

    const defaultTemplate = useMemo(
      () => ({
        key: DEFAULT_EMPTY_TEMPLATE_KEY,
        name: i18n.DEFAULT_EMPTY_TEMPLATE_NAME,
        caseFields: getInitialCaseValue({
          owner: configurationOwner,
          connector: configuration.connector,
        }),
      }),
      [configurationOwner, configuration.connector]
    );

    const onTemplateChange = useCallback(
      (caseFields: CasesConfigurationUITemplate['caseFields']) => {
        const caseFormFields = transformTemplateCaseFieldsToCaseFormFields(
          configurationOwner,
          caseFields
        );

        reset({
          resetValues: true,
          defaultValue: getInitialCaseValue({ owner: configurationOwner }),
        });
        updateFieldValues(caseFormFields);
      },
      [configurationOwner, reset, updateFieldValues]
    );

    const firstStep = useMemo(
      () => ({
        title: i18n.STEP_ONE_TITLE,
        children: (
          <TemplateSelector
            isLoading={isSubmitting || isLoading}
            templates={[defaultTemplate, ...configuration.templates]}
            onTemplateChange={onTemplateChange}
          />
        ),
      }),
      [configuration.templates, defaultTemplate, isLoading, isSubmitting, onTemplateChange]
    );

    const secondStep = useMemo(
      () => ({
        title: i18n.STEP_TWO_TITLE,
        children: (
          <CaseFormFields
            configurationCustomFields={configuration.customFields}
            isLoading={isSubmitting}
            setCustomFieldsOptional={false}
            isEditMode={false}
            draftStorageKey={draftStorageKey}
          />
        ),
      }),
      [configuration.customFields, draftStorageKey, isSubmitting]
    );

    const thirdStep = useMemo(
      () => ({
        title: i18n.STEP_THREE_TITLE,
        children: <SyncAlertsToggle isLoading={isSubmitting} />,
      }),
      [isSubmitting]
    );

    const fourthStep = useMemo(
      () => ({
        title: i18n.STEP_FOUR_TITLE,
        children: (
          <Connector
            connectors={connectors}
            isLoadingConnectors={isLoading}
            isLoading={isSubmitting}
            key={configuration.id}
          />
        ),
      }),
      [configuration.id, connectors, isLoading, isSubmitting]
    );

    const allSteps = useMemo(
      () => [firstStep, secondStep, ...(isSyncAlertsEnabled ? [thirdStep] : []), fourthStep],
      [firstStep, secondStep, isSyncAlertsEnabled, thirdStep, fourthStep]
    );

    return (
      <>
        {isSubmitting && (
          <EuiLoadingSpinner
            css={css`
              position: absolute;
              top: 50%;
              left: 50%;
              z-index: 99;
            `}
            data-test-subj="create-case-loading-spinner"
            size="xl"
          />
        )}
        {withSteps ? (
          <EuiSteps
            headingElement="h2"
            steps={allSteps}
            data-test-subj={'case-creation-form-steps'}
          />
        ) : (
          <>
            <EuiSpacer size="l" />
            <EuiFlexGroup direction="column">
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>{i18n.STEP_ONE_TITLE}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>{firstStep.children}</EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>{i18n.STEP_TWO_TITLE}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>{secondStep.children}</EuiFlexItem>
              </EuiFlexGroup>
              {isSyncAlertsEnabled && (
                <EuiFlexGroup direction="column">
                  <EuiFlexItem>
                    <EuiTitle size="s">
                      <h2>{i18n.STEP_THREE_TITLE}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem>{thirdStep.children}</EuiFlexItem>
                </EuiFlexGroup>
              )}
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>{i18n.STEP_FOUR_TITLE}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>{fourthStep.children}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>
          </>
        )}
      </>
    );
  }
);

CreateCaseFormFields.displayName = 'CreateCaseFormFields';
