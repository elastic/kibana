/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import type { Integration, RelatedIntegration } from '../../../../../common/api/detection_engine';
import type { FieldHook } from '../../../../shared_imports';
import { VALIDATION_TYPES } from '../../../../shared_imports';
import { useIntegrations } from '../../../../detections/components/rules/related_integrations/use_integrations';

interface RelatedIntegrationsProps {
  field: FieldHook;
}

export function RelatedIntegrations({ field }: RelatedIntegrationsProps): JSX.Element {
  const integrations = useIntegrations();
  const options = useMemo<Array<EuiComboBoxOptionOption<RelatedIntegration>>>(
    () => integrations.data?.map(transformIntegrationToOption) ?? [],
    [integrations]
  );
  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<RelatedIntegration>>>(
    () => (field.value as RelatedIntegration[]).map((v) => findOptionOrDefault(options, v)),
    [field, options]
  );

  const handleChange = useCallback(
    (changedSelectedOptions: Array<EuiComboBoxOptionOption<RelatedIntegration>>) => {
      field.setValue(changedSelectedOptions.map((option) => option.value));
    },
    [field]
  );
  const handleSearchChange = useCallback(
    (value: string) => {
      if (value !== undefined) {
        field.clearErrors(VALIDATION_TYPES.ARRAY_ITEM);
      }
    },
    [field]
  );

  return (
    <EuiComboBox<RelatedIntegration>
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      onSearchChange={handleSearchChange}
      fullWidth
      isDisabled={!integrations.data}
    />
  );
}

function transformIntegrationToOption(
  integration: Integration
): EuiComboBoxOptionOption<RelatedIntegration> {
  return {
    key: getKey(integration.package_name, integration.integration_name),
    label: integration.integration_title ?? integration.package_title,
    value: {
      package: integration.package_name,
      version: integration.installed_package_version
        ? `^${integration.installed_package_version}`
        : `^${integration.latest_package_version}`,
      integration: integration.integration_name,
    },
  };
}

function findOptionOrDefault(
  options: Array<EuiComboBoxOptionOption<RelatedIntegration>>,
  relatedIntegration: RelatedIntegration
): EuiComboBoxOptionOption<RelatedIntegration> {
  const key = getKey(relatedIntegration.package, relatedIntegration.integration);

  return (
    options.find((x) => x.key === key) ?? {
      label: `${relatedIntegration.package} ${relatedIntegration.integration ?? ''}`,
      value: relatedIntegration,
    }
  );
}

function getKey(packageName: string, integrationName = ''): string {
  return `${packageName}${integrationName}`;
}
