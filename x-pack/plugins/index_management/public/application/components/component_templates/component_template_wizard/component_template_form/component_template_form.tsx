/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';

import {
  serializers,
  Forms,
  ComponentTemplateDeserialized,
  CommonWizardSteps,
  StepSettingsContainer,
  StepMappingsContainer,
  StepAliasesContainer,
} from '../../shared_imports';
import { useComponentTemplatesContext } from '../../component_templates_context';
import { StepLogisticsContainer, StepReviewContainer } from './steps';

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
      defaultMessage: 'Review',
    }),
  },
};

export const ComponentTemplateForm = ({
  defaultValue = {
    name: '',
    template: {},
    _meta: {},
    _kbnMeta: {
      usedBy: [],
      isManaged: false,
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

  const { documentation } = useComponentTemplatesContext();

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

  const apiError = saveError ? (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplateForm.saveTemplateError"
            defaultMessage="Unable to create component template"
          />
        }
        color="danger"
        iconType="alert"
        data-test-subj="saveComponentTemplateError"
      >
        <div>{saveError.message || saveError.statusText}</div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;

  /**
   * If no mappings, settings or aliases are defined, it is better to not send an empty
   * object for those values.
   * @param componentTemplate The component template object to clean up
   */
  const cleanupComponentTemplateObject = (componentTemplate: ComponentTemplateDeserialized) => {
    const outputTemplate = { ...componentTemplate };

    if (outputTemplate.template.settings === undefined) {
      delete outputTemplate.template.settings;
    }

    if (outputTemplate.template.mappings === undefined) {
      delete outputTemplate.template.mappings;
    }

    if (outputTemplate.template.aliases === undefined) {
      delete outputTemplate.template.aliases;
    }

    return outputTemplate;
  };

  const buildComponentTemplateObject = useCallback(
    (initialTemplate: ComponentTemplateDeserialized) => (
      wizardData: WizardContent
    ): ComponentTemplateDeserialized => {
      const outputComponentTemplate = {
        ...initialTemplate,
        name: wizardData.logistics.name,
        version: wizardData.logistics.version,
        _meta: wizardData.logistics._meta,
        template: {
          settings: wizardData.settings,
          mappings: wizardData.mappings,
          aliases: wizardData.aliases,
        },
      };
      return cleanupComponentTemplateObject(outputComponentTemplate);
    },
    []
  );

  const onSaveComponentTemplate = useCallback(
    async (wizardData: WizardContent) => {
      const componentTemplate = buildComponentTemplateObject(defaultValue)(wizardData);

      // This will strip an empty string if "version" is not set, as well as an empty "_meta" object
      onSave(
        stripEmptyFields(componentTemplate, {
          types: ['string'],
        }) as ComponentTemplateDeserialized
      );

      clearSaveError();
    },
    [buildComponentTemplateObject, defaultValue, onSave, clearSaveError]
  );

  return (
    <FormWizard<WizardContent>
      defaultValue={wizardDefaultValue}
      onSave={onSaveComponentTemplate}
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
        <StepSettingsContainer esDocsBase={documentation.esDocsBase} />
      </FormWizardStep>

      <FormWizardStep id={wizardSections.mappings.id} label={wizardSections.mappings.label}>
        <StepMappingsContainer esDocsBase={documentation.esDocsBase} />
      </FormWizardStep>

      <FormWizardStep id={wizardSections.aliases.id} label={wizardSections.aliases.label}>
        <StepAliasesContainer esDocsBase={documentation.esDocsBase} />
      </FormWizardStep>

      <FormWizardStep id={wizardSections.review.id} label={wizardSections.review.label}>
        <StepReviewContainer
          getComponentTemplateData={buildComponentTemplateObject(defaultValue)}
        />
      </FormWizardStep>
    </FormWizard>
  );
};
