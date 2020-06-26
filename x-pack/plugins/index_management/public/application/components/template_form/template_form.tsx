/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer } from '@elastic/eui';

import { TemplateDeserialized, CREATE_LEGACY_TEMPLATE_BY_DEFAULT } from '../../../../common';
import { serializers, Forms } from '../../../shared_imports';
import { SectionError } from '../section_error';
import { StepLogisticsContainer, StepReviewContainer } from './steps';
import {
  CommonWizardSteps,
  StepSettingsContainer,
  StepMappingsContainer,
  StepAliasesContainer,
} from '../shared';
import { documentationService } from '../../services/documentation';

const { stripEmptyFields } = serializers;
const { FormWizard, FormWizardStep } = Forms;

interface Props {
  onSave: (template: TemplateDeserialized) => void;
  clearSaveError: () => void;
  isSaving: boolean;
  saveError: any;
  defaultValue?: TemplateDeserialized;
  isEditing?: boolean;
}

export interface WizardContent extends CommonWizardSteps {
  logistics: Omit<TemplateDeserialized, '_kbnMeta' | 'template'>;
}

export type WizardSection = keyof WizardContent | 'review';

const wizardSections: { [id: string]: { id: WizardSection; label: string } } = {
  logistics: {
    id: 'logistics',
    label: i18n.translate('xpack.idxMgmt.templateForm.steps.logisticsStepName', {
      defaultMessage: 'Logistics',
    }),
  },
  settings: {
    id: 'settings',
    label: i18n.translate('xpack.idxMgmt.templateForm.steps.settingsStepName', {
      defaultMessage: 'Index settings',
    }),
  },
  mappings: {
    id: 'mappings',
    label: i18n.translate('xpack.idxMgmt.templateForm.steps.mappingsStepName', {
      defaultMessage: 'Mappings',
    }),
  },
  aliases: {
    id: 'aliases',
    label: i18n.translate('xpack.idxMgmt.templateForm.steps.aliasesStepName', {
      defaultMessage: 'Aliases',
    }),
  },
  review: {
    id: 'review',
    label: i18n.translate('xpack.idxMgmt.templateForm.steps.summaryStepName', {
      defaultMessage: 'Review template',
    }),
  },
};

export const TemplateForm = ({
  defaultValue = {
    name: '',
    indexPatterns: [],
    template: {
      settings: {},
      mappings: {},
      aliases: {},
    },
    _kbnMeta: {
      isManaged: false,
      isLegacy: CREATE_LEGACY_TEMPLATE_BY_DEFAULT,
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
    _kbnMeta,
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
        id="xpack.idxMgmt.templateForm.saveButtonLabel"
        defaultMessage="Save template"
      />
    ) : (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.createButtonLabel"
        defaultMessage="Create template"
      />
    ),
  };

  const apiError = saveError ? (
    <>
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.saveTemplateError"
            defaultMessage="Unable to create template"
          />
        }
        error={saveError}
        data-test-subj="saveTemplateError"
      />
      <EuiSpacer size="m" />
    </>
  ) : null;

  const buildTemplateObject = (initialTemplate: TemplateDeserialized) => (
    wizardData: WizardContent
  ): TemplateDeserialized => ({
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

      // We need to strip empty string, otherwise if the "order" or "version"
      // are not set, they will be empty string and ES expect a number for those parameters.
      onSave(
        stripEmptyFields(template, {
          types: ['string'],
        }) as TemplateDeserialized
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

      <FormWizardStep id={wizardSections.settings.id} label={wizardSections.settings.label}>
        <StepSettingsContainer esDocsBase={documentationService.getEsDocsBase()} />
      </FormWizardStep>

      <FormWizardStep id={wizardSections.mappings.id} label={wizardSections.mappings.label}>
        <StepMappingsContainer esDocsBase={documentationService.getEsDocsBase()} />
      </FormWizardStep>

      <FormWizardStep id={wizardSections.aliases.id} label={wizardSections.aliases.label}>
        <StepAliasesContainer esDocsBase={documentationService.getEsDocsBase()} />
      </FormWizardStep>

      <FormWizardStep id={wizardSections.review.id} label={wizardSections.review.label}>
        <StepReviewContainer getTemplateData={buildTemplateObject(defaultValue)} />
      </FormWizardStep>
    </FormWizard>
  );
};
