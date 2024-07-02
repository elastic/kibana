/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldSelector } from './field_selector';
import { PopoverExpression } from './popover_expression';

export const allOptionText = i18n.translate('xpack.synthetics.filter.alert.allLabel', {
  defaultMessage: 'All',
});

export function MonitorField({
  value,
  onChange,
}: {
  value?: string[];
  onChange: (value?: string[]) => void;
}) {
  return (
    <PopoverExpression
      value={value?.join(', ') || allOptionText}
      title={i18n.translate('xpack.synthetics.alerting.fields.monitor', {
        defaultMessage: 'Monitor',
      })}
    >
      <FieldSelector
        value={value}
        fieldName="monitorIds"
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.monitorNamesSelectPlaceholder', {
          defaultMessage: 'Select monitor name',
        })}
        dataTestSubj="monitorNameField"
      />
    </PopoverExpression>
  );
}

export function TagsField({
  value,
  onChange,
}: {
  value?: string[];
  onChange: (value?: string[]) => void;
}) {
  return (
    <PopoverExpression
      value={value?.join(', ') || allOptionText}
      title={i18n.translate('xpack.synthetics.alerting.fields.tags', {
        defaultMessage: 'Tags',
      })}
    >
      <FieldSelector
        value={value}
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.tagsSelectPlaceholder', {
          defaultMessage: 'Select tags',
        })}
        dataTestSubj="tagsField"
        fieldName="tags"
      />
    </PopoverExpression>
  );
}

export function MonitorTypeField({
  value,
  onChange,
}: {
  value?: string[];
  onChange: (value?: string[]) => void;
}) {
  const label = i18n.translate('xpack.synthetics.alerting.fields.type', {
    defaultMessage: 'Type',
  });
  return (
    <PopoverExpression value={value?.join(', ') ?? allOptionText} title={label}>
      <FieldSelector
        value={value}
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.monitorTypesSelectPlaceholder', {
          defaultMessage: 'Select monitor type',
        })}
        dataTestSubj="monitorTypeField"
        fieldName="monitorTypes"
      />
    </PopoverExpression>
  );
}

export function LocationsField({
  value,
  onChange,
}: {
  value?: string[];
  onChange: (value: string[]) => void;
}) {
  const label = i18n.translate('xpack.synthetics.alerting.fields.location', {
    defaultMessage: 'Locations',
  });
  return (
    <PopoverExpression value={value?.join(', ') ?? allOptionText} title={label}>
      <FieldSelector
        value={value}
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.locationSelectPlaceholder', {
          defaultMessage: 'Select location',
        })}
        dataTestSubj="monitorLocationField"
        fieldName="locations"
      />
    </PopoverExpression>
  );
}
