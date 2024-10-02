/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldPopoverExpression } from './field_popover_expression';
import { Suggestion } from '../hooks/use_fetch_synthetics_suggestions';
import { FieldSelector } from './field_selector';

interface FieldProps {
  value?: string[];
  onChange: (value?: string[]) => void;
  setSearch: (val: string) => void;
  suggestions?: Suggestion[];
  allSuggestions?: Record<string, Suggestion[]>;
  isLoading?: boolean;
  setSelectedField: (value?: string) => void;
  selectedField?: string;
}

export const allOptionText = i18n.translate('xpack.synthetics.filter.alert.allLabel', {
  defaultMessage: 'All',
});

export function MonitorField({ value, onChange, ...rest }: FieldProps) {
  return (
    <FieldPopoverExpression
      value={value}
      title={i18n.translate('xpack.synthetics.alerting.fields.monitor', {
        defaultMessage: 'Monitor',
      })}
      fieldName="monitorIds"
      selectedField={rest.selectedField}
      setSelectedField={rest.setSelectedField}
      allSuggestions={rest.allSuggestions}
    >
      <FieldSelector
        value={value}
        fieldName="monitorIds"
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.monitorNamesSelectPlaceholder', {
          defaultMessage: 'Select monitor name',
        })}
        dataTestSubj="monitorNameField"
        {...rest}
      />
    </FieldPopoverExpression>
  );
}

export function TagsField({ value, onChange, ...rest }: FieldProps) {
  return (
    <FieldPopoverExpression
      value={value}
      title={i18n.translate('xpack.synthetics.alerting.fields.tags', {
        defaultMessage: 'Tags',
      })}
      fieldName="tags"
      selectedField={rest.selectedField}
      setSelectedField={rest.setSelectedField}
      allSuggestions={rest.allSuggestions}
    >
      <FieldSelector
        value={value}
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.tagsSelectPlaceholder', {
          defaultMessage: 'Select tags',
        })}
        dataTestSubj="tagsField"
        fieldName="tags"
        {...rest}
      />
    </FieldPopoverExpression>
  );
}

export function MonitorTypeField({ value, onChange, ...rest }: FieldProps) {
  const label = i18n.translate('xpack.synthetics.alerting.fields.type', {
    defaultMessage: 'Type',
  });
  return (
    <FieldPopoverExpression
      value={value}
      title={label}
      fieldName="monitorTypes"
      selectedField={rest.selectedField}
      setSelectedField={rest.setSelectedField}
      allSuggestions={rest.allSuggestions}
    >
      <FieldSelector
        value={value}
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.monitorTypesSelectPlaceholder', {
          defaultMessage: 'Select monitor type',
        })}
        dataTestSubj="monitorTypeField"
        fieldName="monitorTypes"
        {...rest}
      />
    </FieldPopoverExpression>
  );
}

export function LocationsField({ value, onChange, ...rest }: FieldProps) {
  const label = i18n.translate('xpack.synthetics.alerting.fields.location', {
    defaultMessage: 'Locations',
  });
  return (
    <FieldPopoverExpression
      value={value}
      title={label}
      fieldName="locations"
      selectedField={rest.selectedField}
      setSelectedField={rest.setSelectedField}
      allSuggestions={rest.allSuggestions}
    >
      <FieldSelector
        value={value}
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.locationSelectPlaceholder', {
          defaultMessage: 'Select location',
        })}
        dataTestSubj="monitorLocationField"
        fieldName="locations"
        {...rest}
      />
    </FieldPopoverExpression>
  );
}

export function ProjectsField({ value, onChange, ...rest }: FieldProps) {
  const label = i18n.translate('xpack.synthetics.alerting.fields.project', {
    defaultMessage: 'Projects',
  });
  return (
    <FieldPopoverExpression
      value={value}
      title={label}
      fieldName="projects"
      selectedField={rest.selectedField}
      setSelectedField={rest.setSelectedField}
      allSuggestions={rest.allSuggestions}
    >
      <FieldSelector
        value={value}
        onChange={onChange}
        placeholder={i18n.translate('xpack.synthetics.projectSelectPlaceholder', {
          defaultMessage: 'Select project',
        })}
        dataTestSubj="monitorProjectField"
        fieldName="projects"
        {...rest}
      />
    </FieldPopoverExpression>
  );
}
