/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiButton, EuiPageHeader } from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import { TemplateDeserialized } from '../../../../common';
import { serializers, Forms, GlobalFlyout } from '../../../shared_imports';
import {
  CommonWizardSteps,
  StepSettingsContainer,
  StepMappingsContainer,
  StepAliasesContainer,
} from '../shared';
import { documentationService } from '../../services/documentation';
import { SectionError } from '../section_error';
import {
  SimulateTemplateFlyoutContent,
  SimulateTemplateProps,
  simulateTemplateFlyoutProps,
  SimulateTemplateFilters,
  LegacyIndexTemplatesDeprecation,
} from '../index_templates';
import { StepLogisticsContainer, StepComponentContainer, StepReviewContainer } from './steps';

const { stripEmptyFields } = serializers;
const { FormWizard, FormWizardStep } = Forms;
const { useGlobalFlyout } = GlobalFlyout;

interface Props {
  title: string | JSX.Element;
  onSave: (template: TemplateDeserialized) => void;
  clearSaveError: () => void;
  isSaving: boolean;
  saveError: any;
  history?: ScopedHistory;
  isLegacy?: boolean;
  defaultValue?: TemplateDeserialized;
  isEditing?: boolean;
}

export interface WizardContent extends CommonWizardSteps {
  logistics: Omit<TemplateDeserialized, '_kbnMeta' | 'template'>;
  components: TemplateDeserialized['composedOf'];
}

export type WizardSection = keyof WizardContent | 'review';

const wizardSections: { [id: string]: { id: WizardSection; label: string } } = {
  logistics: {
    id: 'logistics',
    label: i18n.translate('xpack.idxMgmt.templateForm.steps.logisticsStepName', {
      defaultMessage: 'Logistics',
    }),
  },
  components: {
    id: 'components',
    label: i18n.translate('xpack.idxMgmt.templateForm.steps.componentsStepName', {
      defaultMessage: 'Component templates',
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
  title,
  defaultValue,
  isEditing,
  isSaving,
  isLegacy = false,
  saveError,
  clearSaveError,
  onSave,
  history,
}: Props) => {
  const [wizardContent, setWizardContent] = useState<Forms.Content<WizardContent> | null>(null);
  const { addContent: addContentToGlobalFlyout, closeFlyout } = useGlobalFlyout();
  const simulateTemplateFilters = useRef<SimulateTemplateFilters>({
    mappings: true,
    settings: true,
    aliases: true,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const indexTemplate = defaultValue ?? {
    name: '',
    indexPatterns: [],
    template: {},
    _kbnMeta: {
      type: 'default',
      hasDatastream: false,
      isLegacy,
    },
  };

  const {
    template: { settings, mappings, aliases } = {},
    composedOf,
    _kbnMeta,
    ...logistics
  } = indexTemplate;

  const wizardDefaultValue: WizardContent = {
    logistics,
    settings,
    mappings,
    aliases,
    components: indexTemplate.composedOf,
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

  /**
   * If no mappings, settings or aliases are defined, it is better to not send empty
   * object for those values.
   * This method takes care of that and other cleanup of empty fields.
   * @param template The template object to clean up
   */
  const cleanupTemplateObject = (template: TemplateDeserialized) => {
    const outputTemplate = { ...template };

    if (outputTemplate.template) {
      if (outputTemplate.template.settings === undefined) {
        delete outputTemplate.template.settings;
      }
      if (outputTemplate.template.mappings === undefined) {
        delete outputTemplate.template.mappings;
      }
      if (outputTemplate.template.aliases === undefined) {
        delete outputTemplate.template.aliases;
      }
      if (Object.keys(outputTemplate.template).length === 0) {
        delete outputTemplate.template;
      }
    }

    return outputTemplate;
  };

  const buildTemplateObject = useCallback(
    (initialTemplate: TemplateDeserialized) =>
      (wizardData: WizardContent): TemplateDeserialized => {
        const outputTemplate = {
          ...wizardData.logistics,
          _kbnMeta: initialTemplate._kbnMeta,
          composedOf: wizardData.components,
          template: {
            settings: wizardData.settings,
            mappings: wizardData.mappings,
            aliases: wizardData.aliases,
          },
        };

        return cleanupTemplateObject(outputTemplate);
      },
    []
  );

  const onWizardContentChange = useCallback((content: Forms.Content<WizardContent>) => {
    setWizardContent(content);
  }, []);

  const onSaveTemplate = useCallback(
    async (wizardData: WizardContent) => {
      const template = buildTemplateObject(indexTemplate)(wizardData);

      // We need to strip empty string, otherwise if the "order" or "version"
      // are not set, they will be empty string and ES expect a number for those parameters.
      onSave(
        stripEmptyFields(template, {
          types: ['string'],
        }) as TemplateDeserialized
      );

      clearSaveError();
    },
    [indexTemplate, buildTemplateObject, onSave, clearSaveError]
  );

  const getSimulateTemplate = useCallback(async () => {
    if (!wizardContent) {
      return;
    }
    const isValid = await wizardContent.validate();
    if (!isValid) {
      return;
    }
    const wizardData = wizardContent.getData();
    const template = buildTemplateObject(indexTemplate)(wizardData);
    return template;
  }, [buildTemplateObject, indexTemplate, wizardContent]);

  const onSimulateTemplateFiltersChange = useCallback((filters: SimulateTemplateFilters) => {
    simulateTemplateFilters.current = filters;
  }, []);

  const showPreviewFlyout = () => {
    addContentToGlobalFlyout<SimulateTemplateProps>({
      id: 'simulateTemplate',
      Component: SimulateTemplateFlyoutContent,
      props: {
        getTemplate: getSimulateTemplate,
        onClose: closeFlyout,
        filters: simulateTemplateFilters.current,
        onFiltersChange: onSimulateTemplateFiltersChange,
      },
      flyoutProps: simulateTemplateFlyoutProps,
    });
  };

  const getRightContentWizardNav = (stepId: WizardSection) => {
    if (isLegacy) {
      return null;
    }

    // Don't show "Preview template" button on logistics and review steps
    if (stepId === 'logistics' || stepId === 'review') {
      return null;
    }

    return (
      <EuiButton size="s" onClick={showPreviewFlyout}>
        <FormattedMessage
          id="xpack.idxMgmt.templateForm.previewIndexTemplateButtonLabel"
          defaultMessage="Preview index template"
        />
      </EuiButton>
    );
  };

  const isLegacyIndexTemplate = indexTemplate._kbnMeta.isLegacy === true;

  return (
    <>
      {/* Form header */}
      <EuiPageHeader pageTitle={<span data-test-subj="pageTitle">{title}</span>} bottomBorder />

      <EuiSpacer size="m" />

      {isLegacyIndexTemplate && (
        <LegacyIndexTemplatesDeprecation history={history} showCta={true} />
      )}

      <EuiSpacer size="s" />

      <FormWizard<WizardContent, WizardSection>
        defaultValue={wizardDefaultValue}
        onSave={onSaveTemplate}
        isEditing={isEditing}
        isSaving={isSaving}
        apiError={apiError}
        texts={i18nTexts}
        onChange={onWizardContentChange}
        rightContentNav={getRightContentWizardNav}
      >
        <FormWizardStep
          id={wizardSections.logistics.id}
          label={wizardSections.logistics.label}
          isRequired
        >
          <StepLogisticsContainer
            isEditing={isEditing}
            isLegacy={indexTemplate._kbnMeta.isLegacy}
          />
        </FormWizardStep>

        {!isLegacyIndexTemplate && (
          <FormWizardStep id={wizardSections.components.id} label={wizardSections.components.label}>
            <StepComponentContainer />
          </FormWizardStep>
        )}

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
          <StepReviewContainer getTemplateData={buildTemplateObject(indexTemplate)} />
        </FormWizardStep>
      </FormWizard>
    </>
  );
};
