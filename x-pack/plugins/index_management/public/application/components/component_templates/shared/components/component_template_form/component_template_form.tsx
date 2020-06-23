/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer } from '@elastic/eui';

import { serializers, Forms, ComponentTemplateDeserialized } from '../../../shared_imports';
// import { SectionError } from '../section_error';
import { StepLogisticsContainer, StepReviewContainer } from './steps';
import {
  CommonWizardSteps,
  StepSettingsContainer,
  StepMappingsContainer,
  StepAliasesContainer,
} from '../../../../shared';

const { stripEmptyFields } = serializers;
const { FormWizard, FormWizardStep } = Forms;

interface Props {
  onSave: (componentTemplate: ComponentTemplateDeserialized) => void;
  clearSaveError: () => void;
  isSaving: boolean;
  saveError: any;
  defaultValue?: ComponentTemplateDeserialized;
  isEditing?: boolean;
}

export interface WizardContent extends CommonWizardSteps {
  logistics: Omit<ComponentTemplateDeserialized, '_kbnMeta' | 'template'>;
}

export type WizardSection = keyof WizardContent | 'review';

const wizardSections: { [id: string]: { id: WizardSection; label: string } } = {
  logistics: {
    id: 'logistics',
    label: i18n.translate('xpack.idxMgmt.componentTemplateForm.steps.logisticsStepName', {
      defaultMessage: 'Logistics',
    }),
  },
  settings: {
    id: 'settings',
    label: i18n.translate('xpack.idxMgmt.componentTemplateForm.steps.settingsStepName', {
      defaultMessage: 'Index settings',
    }),
  },
  mappings: {
    id: 'mappings',
    label: i18n.translate('xpack.idxMgmt.componentTemplateForm.steps.mappingsStepName', {
      defaultMessage: 'Mappings',
    }),
  },
  aliases: {
    id: 'aliases',
    label: i18n.translate('xpack.idxMgmt.componentTemplateForm.steps.aliasesStepName', {
      defaultMessage: 'Aliases',
    }),
  },
  review: {
    id: 'review',
    label: i18n.translate('xpack.idxMgmt.componentTemplateForm.steps.summaryStepName', {
      defaultMessage: 'Review component template',
    }),
  },
};

export const ComponentTemplateForm = ({
  defaultValue = {
    name: '',
    _meta: {},
    template: {
      settings: {},
      mappings: {},
      aliases: {},
    },
    _kbnMeta: {
      // TODO
      usedBy: [],
    },
  },
  isEditing,
  isSaving,
  saveError,
  clearSaveError,
  onSave,
}: Props) => {
  const {
    template: { settings, mappings, aliases },
    ...logistics
  } = defaultValue;

  const wizardDefaultValue: WizardContent = {
    logistics,
    settings,
    mappings,
    aliases,
  };

  const i18nTexts = {
    save: isEditing ? (
      <FormattedMessage
        id="xpack.idxMgmt.componentTemplateForm.saveButtonLabel"
        defaultMessage="Save component template"
      />
    ) : (
      <FormattedMessage
        id="xpack.idxMgmt.componentTemplateForm.createButtonLabel"
        defaultMessage="Create component template"
      />
    ),
  };

  // TODO implement
  const apiError = saveError ? (
    <>
      {/* <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplateForm.saveTemplateError"
            defaultMessage="Unable to create component template"
          />
        }
        error={saveError}
        data-test-subj="saveComponentTemplateError"
      /> */}
      <EuiSpacer size="m" />
    </>
  ) : null;

  const buildTemplateObject = (initialTemplate: ComponentTemplateDeserialized) => (
    wizardData: WizardContent
  ): ComponentTemplateDeserialized => ({
    ...initialTemplate,
    ...wizardData.logistics,
    template: {
      settings: wizardData.settings,
      mappings: wizardData.mappings,
      aliases: wizardData.aliases,
    },
  });

  const onSaveTemplate = useCallback(
    async (wizardData: WizardContent) => {
      const template = buildTemplateObject(defaultValue)(wizardData);

      // We need to strip empty strings, otherwise if the "version" is not set,
      // it will be an empty string and ES expects a number.
      onSave(
        stripEmptyFields(template, {
          types: ['string'],
        }) as ComponentTemplateDeserialized
      );

      clearSaveError();
    },
    [defaultValue, onSave, clearSaveError]
  );

  return (
    <FormWizard<WizardContent>
      defaultValue={wizardDefaultValue}
      onSave={onSaveTemplate}
      isEditing={isEditing}
      isSaving={isSaving}
      apiError={apiError}
      texts={i18nTexts}
    >
      <FormWizardStep
        id={wizardSections.logistics.id}
        label={wizardSections.logistics.label}
        isRequired
      >
        <StepLogisticsContainer isEditing={isEditing} />
      </FormWizardStep>

      {/* TODO fix doc link */}
      <FormWizardStep id={wizardSections.settings.id} label={wizardSections.settings.label}>
        <StepSettingsContainer esDocsBase="#" />
      </FormWizardStep>

      {/* TODO fix doc link */}
      <FormWizardStep id={wizardSections.mappings.id} label={wizardSections.mappings.label}>
        <StepMappingsContainer esDocsBase="#" />
      </FormWizardStep>

      {/* TODO fix doc link */}
      <FormWizardStep id={wizardSections.aliases.id} label={wizardSections.aliases.label}>
        <StepAliasesContainer esDocsBase="#" />
      </FormWizardStep>

      <FormWizardStep id={wizardSections.review.id} label={wizardSections.review.label}>
        <StepReviewContainer getTemplateData={buildTemplateObject(defaultValue)} />
      </FormWizardStep>
    </FormWizard>
  );
};
