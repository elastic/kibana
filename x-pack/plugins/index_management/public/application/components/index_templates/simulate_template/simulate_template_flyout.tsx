/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTextColor,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { useForm, Form, getUseField, CheckBoxField, FormDataProvider } from '../shared_imports';
import { SimulateTemplate, Filters } from './simulate_template';

const CheckBox = getUseField({ component: CheckBoxField });

export interface Props {
  onClose(): void;
  getTemplate: () => { [key: string]: any };
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const defaultFlyoutProps = {
  'data-test-subj': 'simulateTemplateFlyout',
  'aria-labelledby': 'simulateTemplateFlyoutTitle',
};

const i18nTexts = {
  filters: {
    label: i18n.translate('xpack.idxMgmt.simulateTemplate.filters.label', {
      defaultMessage: 'Include:',
    }),
    mappings: i18n.translate('xpack.idxMgmt.simulateTemplate.filters.mappings', {
      defaultMessage: 'Mappings',
    }),
    indexSettings: i18n.translate('xpack.idxMgmt.simulateTemplate.filters.indexSettings', {
      defaultMessage: 'Index settings',
    }),
    aliases: i18n.translate('xpack.idxMgmt.simulateTemplate.filters.aliases', {
      defaultMessage: 'Aliases',
    }),
  },
};

export const SimulateTemplateFlyoutContent = ({
  onClose,
  getTemplate,
  filters,
  onFiltersChange,
}: Props) => {
  const isMounted = useRef(false);
  const [template, setTemplate] = useState<{ [key: string]: any }>({});
  const { form } = useForm<Filters>({ defaultValue: filters });
  const { subscribe } = form;

  useEffect(() => {
    subscribe((formState) => {
      onFiltersChange(formState.data.format());
    });
  }, [subscribe, onFiltersChange]);

  const updatePreview = useCallback(async () => {
    const indexTemplate = await getTemplate();
    setTemplate(indexTemplate);
  }, [getTemplate]);

  useEffect(() => {
    if (isMounted.current === false) {
      updatePreview();
    }
    isMounted.current = true;
  }, [updatePreview]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="componentTemplatesFlyoutTitle" data-test-subj="title">
            <FormattedMessage
              id="xpack.idxMgmt.simulateTemplate.title"
              defaultMessage="Preview index template"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiTextColor color="subdued">
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.simulateTemplate.descriptionText"
                defaultMessage="This is the final template that will be applied to matching indices based on the
                component templates you have selected and any overrides you've added."
              />
            </p>
          </EuiText>
        </EuiTextColor>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">
        <Form form={form}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>{i18nTexts.filters.label}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CheckBox path="mappings" config={{ label: i18nTexts.filters.mappings }} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CheckBox path="settings" config={{ label: i18nTexts.filters.indexSettings }} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CheckBox path="aliases" config={{ label: i18nTexts.filters.aliases }} />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          <FormDataProvider>
            {(formData) => {
              return <SimulateTemplate template={template} filters={formData as Filters} />;
            }}
          </FormDataProvider>
        </Form>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={onClose}
              data-test-subj="closeDetailsButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.simulateTemplate.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              onClick={updatePreview}
              data-test-subj="updateSimulationButton"
              fill
            >
              <FormattedMessage
                id="xpack.idxMgmt.simulateTemplate.updateButtonLabel"
                defaultMessage="Update"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
