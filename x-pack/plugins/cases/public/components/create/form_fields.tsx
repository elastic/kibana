/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { EuiLoadingSpinner, EuiSteps } from '@elastic/eui';
import { css } from '@emotion/react';

import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { ActionConnector } from '../../../common/types/domain';
import { Title } from '../case_form_fields/title';
import { Description } from '../case_form_fields/description';
import { Tags } from '../case_form_fields/tags';
import { Connector } from '../case_form_fields/connector';
import * as i18n from './translations';
import { SyncAlertsToggle } from '../case_form_fields/sync_alerts_toggle';
import type {
  CasesConfigurationUI,
  CasesConfigurationUITemplate,
  CaseUICustomField,
} from '../../containers/types';
import { removeEmptyFields } from '../utils';
import { initialCaseValue } from './form_context';
import { useCasesFeatures } from '../../common/use_cases_features';
import { Severity } from '../case_form_fields/severity';
import { Assignees } from '../case_form_fields/assignees';
import { Category } from '../case_form_fields/category';
import { TemplateSelector } from './templates';
import { CustomFields } from '../case_form_fields/custom_fields';
import type { CreateCaseFormSchema } from './schema';

export interface CreateCaseFormFieldsProps {
  configuration: CasesConfigurationUI;
  connectors: ActionConnector[];
  isLoading: boolean;
  withSteps: boolean;
  draftStorageKey: string;
}

type CaseUICustomFieldWithNoNullValues = CaseUICustomField & {
  value: NonNullable<CaseUICustomField['value']>;
};

const transformTemplateCaseFieldsToCaseFormFields = (
  caseTemplateFields: CasesConfigurationUITemplate['caseFields']
): Partial<CreateCaseFormSchema> => {
  const customFields = Object.fromEntries(
    caseTemplateFields?.customFields
      ?.filter(
        (customField): customField is CaseUICustomFieldWithNoNullValues => customField.value != null
      )
      .map((customField) => [customField.key, customField.value]) ?? []
  );

  const caseFields = removeEmptyFields({
    title: caseTemplateFields?.title,
    assignees: caseTemplateFields?.assignees,
    tags: caseTemplateFields?.tags,
    category: caseTemplateFields?.category,
    severity: caseTemplateFields?.severity,
    description: caseTemplateFields?.description,
    connectorId: caseTemplateFields?.connector?.id,
    customFields,
  });

  return {
    ...caseFields,
    ...(caseTemplateFields?.connector?.id != null && caseTemplateFields?.connector?.fields != null
      ? { fields: caseTemplateFields?.connector?.fields }
      : {}),
  };
};

export const CreateCaseFormFields: React.FC<CreateCaseFormFieldsProps> = React.memo(
  ({ configuration, connectors, isLoading, withSteps, draftStorageKey }) => {
    const { reset, updateFieldValues, isSubmitting, setFieldValue } = useFormContext();
    const { isSyncAlertsEnabled, caseAssignmentAuthorized } = useCasesFeatures();
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

    const onTemplateChange = useCallback(
      (caseFields: CasesConfigurationUITemplate['caseFields']) => {
        const caseFormFields = transformTemplateCaseFieldsToCaseFormFields(caseFields);
        reset({ resetValues: true, defaultValue: initialCaseValue });
        updateFieldValues(caseFormFields);
      },
      [reset, updateFieldValues]
    );

    const firstStep = useMemo(
      () => ({
        title: i18n.STEP_ONE_TITLE,
        children: (
          <TemplateSelector
            isLoading={isSubmitting || isLoading}
            templates={configuration.templates}
            onTemplateChange={onTemplateChange}
          />
        ),
      }),
      [configuration.templates, isLoading, isSubmitting, onTemplateChange]
    );

    const secondStep = useMemo(
      () => ({
        title: i18n.STEP_TWO_TITLE,
        children: (
          <>
            <Title isLoading={isSubmitting} autoFocus={true} />
            {caseAssignmentAuthorized ? <Assignees isLoading={isSubmitting} /> : null}
            <Tags isLoading={isSubmitting} />
            <Category isLoading={isSubmitting} />
            <Severity isLoading={isSubmitting} />
            <Description isLoading={isSubmitting} draftStorageKey={draftStorageKey} />
            <CustomFields
              isLoading={isSubmitting || isLoading}
              configurationCustomFields={configuration.customFields}
            />
          </>
        ),
      }),
      [
        isSubmitting,
        caseAssignmentAuthorized,
        isLoading,
        draftStorageKey,
        configuration.customFields,
      ]
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
            key={`${configurationOwner}-${configuration.connector.id}`}
          />
        ),
      }),
      [configuration.connector.id, configurationOwner, connectors, isLoading, isSubmitting]
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
            {firstStep.children}
            {secondStep.children}
            {isSyncAlertsEnabled && thirdStep.children}
            {fourthStep.children}
          </>
        )}
      </>
    );
  }
);

CreateCaseFormFields.displayName = 'CreateCaseFormFields';
