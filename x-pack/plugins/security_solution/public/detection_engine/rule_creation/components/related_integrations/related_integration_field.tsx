/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo } from 'react';
import { capitalize } from 'lodash';
import semver from 'semver';
import { css } from '@emotion/css';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiTextTruncate,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
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

    const options = unusedIntegrations.map(transformIntegrationToOption);
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
          ? calculateRelevantSemver(changedSelectedOption.value)
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

  const hasError = Boolean(packageErrorMessage) || Boolean(versionErrorMessage);

  return (
    <EuiFormRow
      fullWidth
      isInvalid={hasError}
      error={packageErrorMessage?.message ?? versionErrorMessage?.message}
      helpText={hasError ? undefined : i18n.RELATED_INTEGRATION_FIELDS_HELP_TEXT}
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={8} className={ROW_OVERFLOW_FIX_STYLE}>
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
            data-test-subj="relatedIntegrationComboBox"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3} className={MIN_WIDTH_VERSION_CONSTRAIN_STYLE}>
          <EuiFieldText
            placeholder={i18n.RELATED_INTEGRATION_VERSION_DEPENDENCY_PLACEHOLDER}
            prepend={i18n.INTEGRATION_VERSION}
            isLoading={isInitialLoading}
            disabled={!field.value.package || !integrations}
            aria-label={i18n.RELATED_INTEGRATION_VERSION_DEPENDENCY_ARIA_LABEL}
            value={field.value.version}
            onChange={handleVersionChange}
            isInvalid={Boolean(versionErrorMessage)}
            data-test-subj="relatedIntegrationVersionDependency"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            onClick={onRemove}
            isDisabled={!integrations}
            iconType="trash"
            aria-label={i18n.REMOVE_RELATED_INTEGRATION_BUTTON_ARIA_LABEL}
            data-test-subj="relatedIntegrationRemove"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

const ROW_OVERFLOW_FIX_STYLE = css`
  overflow: hidden;
`;

/**
 * Minimum width has been determined empirically like that
 * semver value like `^1.2.3` doesn't overflow
 */
const MIN_WIDTH_VERSION_CONSTRAIN_STYLE = css`
  min-width: 150px;
`;

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
  const integrationTitle = integration.integration_title ?? integration.package_title;
  const label = integration.is_enabled
    ? i18n.INTEGRATION_ENABLED(integrationTitle)
    : integration.is_installed
    ? i18n.INTEGRATION_DISABLED(integrationTitle)
    : integrationTitle;

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
    <EuiFlexGroup data-test-subj="relatedIntegrationComboBoxOption">
      <EuiFlexItem>
        <EuiTextTruncate text={value.integration_title ?? value.package_title} truncation="end" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IntegrationStatusBadge isInstalled={value.is_installed} isEnabled={value.is_enabled} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function calculateRelevantSemver(integration: Integration): string {
  if (!integration.installed_package_version) {
    return `^${integration.latest_package_version}`;
  }

  // In some rare cases users may install a prerelease integration version.
  // We need to build constraint on the latest stable version and
  // it's supposed `latest_package_version` is the latest stable version.
  if (semver.gt(integration.installed_package_version, integration.latest_package_version)) {
    return `^${integration.latest_package_version}`;
  }

  return `^${integration.installed_package_version}`;
}
