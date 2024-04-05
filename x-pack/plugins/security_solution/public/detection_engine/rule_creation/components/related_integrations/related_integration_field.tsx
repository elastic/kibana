/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo } from 'react';
import { capitalize } from 'lodash';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiTextTruncate,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
} from '@elastic/eui';
import type { FieldHook } from '../../../../shared_imports';
import type { Integration, RelatedIntegration } from '../../../../../common/api/detection_engine';
import { useIntegrations } from '../../../../detections/components/rules/related_integrations/use_integrations';
import { IntegrationStatusBadge } from './integration_status_badge';
import * as i18n from './translations';

interface RelatedIntegrationItemFormProps {
  field: FieldHook<RelatedIntegration>;
  relatedIntegrations: RelatedIntegration[];
  onRemove: () => void;
}

export function RelatedIntegrationField({
  field,
  relatedIntegrations,
  onRemove,
}: RelatedIntegrationItemFormProps): JSX.Element {
  const { data: integrations, isInitialLoading } = useIntegrations();
  const [integrationOptions, selectedIntegrationOptions] = useMemo(() => {
    const currentKey = getKey(field.value.package, field.value.integration);
    const relatedIntegrationsButCurrent = relatedIntegrations.filter(
      (ri) => getKey(ri.package, ri.integration) !== currentKey
    );
    const unusedIntegrations = filterOutUsedIntegrations(
      integrations ?? [],
      relatedIntegrationsButCurrent
    );

    const options = unusedIntegrations.map(transformIntegrationToOption) ?? [];
    const fallbackSelectedOption =
      field.value.package.length > 0
        ? {
            key: currentKey,
            label: `${capitalize(field.value.package)} ${field.value.integration ?? ''}`,
          }
        : undefined;
    const selectedOption =
      options.find((option) => option.key === currentKey) ?? fallbackSelectedOption;

    return [options, selectedOption ? [selectedOption] : []];
  }, [integrations, field.value, relatedIntegrations]);

  const [packageErrorMessage, versionErrorMessage] = useMemo(() => {
    const packagePath = `${field.path}.package`;
    const versionPath = `${field.path}.version`;

    return [
      field.errors.find((err) => 'path' in err && err.path === packagePath),
      field.errors.find((err) => 'path' in err && err.path === versionPath),
    ];
  }, [field.path, field.errors]);

  const handleIntegrationChange = useCallback(
    ([changedSelectedOption]: Array<EuiComboBoxOptionOption<Integration>>) =>
      field.setValue({
        package: changedSelectedOption?.value?.package_name ?? '',
        integration: changedSelectedOption?.value?.integration_name,
        version: changedSelectedOption?.value
          ? changedSelectedOption.value.installed_package_version
            ? `^${changedSelectedOption.value.installed_package_version}`
            : `^${changedSelectedOption.value.latest_package_version}`
          : '',
      }),
    [field]
  );

  const handleVersionChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      field.setValue((oldValue) => ({
        ...oldValue,
        version: e.target.value,
      })),
    [field]
  );

  return (
    <EuiPanel color="subdued">
      <EuiFormRow
        fullWidth
        isInvalid={Boolean(packageErrorMessage) || Boolean(versionErrorMessage)}
        error={packageErrorMessage?.message ?? versionErrorMessage?.message}
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={8}>
            <EuiComboBox<Integration>
              options={integrationOptions}
              renderOption={renderIntegrationOption}
              selectedOptions={selectedIntegrationOptions}
              singleSelection
              isLoading={isInitialLoading}
              isDisabled={!integrations}
              onChange={handleIntegrationChange}
              fullWidth
              aria-label={i18n.RELATED_INTEGRATION_ARIA_LABEL}
              isInvalid={Boolean(packageErrorMessage)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiFieldText
              placeholder={i18n.RELATED_INTEGRATION_VERSION_DEPENDENCY_PLACEHOLDER}
              prepend={i18n.INTEGRATION_VERSION}
              isLoading={isInitialLoading}
              disabled={!field.value.package || !integrations}
              aria-label={i18n.RELATED_INTEGRATION_VERSION_DEPENDENCY_ARIA_LABEL}
              value={field.value.version}
              onChange={handleVersionChange}
              isInvalid={Boolean(versionErrorMessage)}
              data-test-subj="related-integration-version-dependency"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="danger"
              onClick={onRemove}
              isDisabled={!integrations}
              iconType="minusInCircle"
              aria-label={i18n.REMOVE_RELATED_INTEGRATION_BUTTON_ARIA_LABEL}
              data-test-subj="related-integration-remove"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiPanel>
  );
}

function filterOutUsedIntegrations(
  integrations: Integration[],
  relatedIntegrations: RelatedIntegration[]
): Integration[] {
  const usedIntegrationsSet = new Set(
    relatedIntegrations.map((ri) => getKey(ri.package, ri.integration))
  );

  return integrations?.filter(
    (i) => !usedIntegrationsSet.has(getKey(i.package_name, i.integration_name))
  );
}

function transformIntegrationToOption(
  integration: Integration
): EuiComboBoxOptionOption<Integration> {
  const label = [
    integration.integration_title ?? integration.package_title,
    integration.is_enabled
      ? `: ${i18n.INTEGRATION_ENABLED}`
      : integration.is_installed
      ? `: ${i18n.INTEGRATION_DISABLED}`
      : '',
  ].join('');

  return {
    key: getKey(integration.package_name, integration.integration_name),
    label,
    value: integration,
    color: integration.is_enabled ? 'success' : integration.is_installed ? 'primary' : undefined,
  };
}

function getKey(packageName: string | undefined, integrationName: string | undefined): string {
  return `${packageName ?? ''}${integrationName ?? ''}`;
}

function renderIntegrationOption(
  option: EuiComboBoxOptionOption<Integration>
): JSX.Element | string {
  const { label, value } = option;

  if (!value) {
    return label;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTextTruncate text={value.integration_title ?? value.package_title} truncation="end" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IntegrationStatusBadge isInstalled={value.is_installed} isEnabled={value.is_enabled} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
