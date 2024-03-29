/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
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
  const { data: integrations } = useIntegrations();
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
    const selectedOptions = options.find((option) => option.key === currentKey);

    return [options, selectedOptions ? [selectedOptions] : []];
  }, [integrations, field.value, relatedIntegrations]);

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
        isInvalid={field.errors.length > 0}
        error={field.errors.length > 0 ? field.errors[0].message : undefined}
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={8}>
            <EuiComboBox<Integration>
              options={integrationOptions}
              renderOption={renderIntegrationOption}
              selectedOptions={selectedIntegrationOptions}
              singleSelection
              onChange={handleIntegrationChange}
              fullWidth
              aria-label={i18n.RELATED_INTEGRATION_ARIA_LABEL}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiFieldText
              placeholder={i18n.RELATED_INTEGRATION_VERSION_DEPENDENCY_PLACEHOLDER}
              prepend={i18n.INTEGRATION_VERSION}
              disabled={!field.value.package}
              aria-label={i18n.RELATED_INTEGRATION_VERSION_DEPENDENCY_ARIA_LABEL}
              value={field.value.version}
              onChange={handleVersionChange}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="danger"
              onClick={onRemove}
              iconType="minusInCircle"
              aria-label={i18n.REMOVE_RELATED_INTEGRATION_BUTTON_ARIA_LABEL}
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
    integration.is_enabled ? ': Enabled' : integration.is_installed ? ': Disabled' : '',
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
  const { label, value, color } = option;

  if (!value) {
    return label;
  }

  const integrationStatus = value.is_enabled
    ? 'Installed: Enabled'
    : value.is_installed
    ? 'Installed: Disabled'
    : 'Not installed';

  return (
    <EuiFlexGroup>
      <EuiFlexItem>{value.integration_title ?? value.package_title}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={color}>{integrationStatus}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
