/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { startCase } from 'lodash';
import { EVENT_CATEGORY_TO_FIELD } from '../right/utils/event_utils';
import type { GetFieldsData } from './hooks/use_get_fields_data';

/**
 * Helper function to retrieve a field's value (used in combination with the custom hook useGetFieldsData (https://github.com/elastic/kibana/blob/main/x-pack/plugins/security_solution/public/common/hooks/use_get_fields_data.ts)
 * @param field type unknown or unknown[]
 * @param emptyValue optional parameter to return if field is incorrect
 * @return the field's value, or null/emptyValue
 */
export const getField = (field: unknown | unknown[], emptyValue?: string) => {
  if (typeof field === 'string') {
    return field;
  } else if (Array.isArray(field) && field.length > 0 && typeof field[0] === 'string') {
    return field[0];
  }
  return emptyValue ?? null;
};

/**
 * Helper function to retrieve a field's value in an array
 * @param field type unknown or unknown[]
 * @return the field's value in an array
 */
export const getFieldArray = (field: unknown | unknown[]) => {
  if (typeof field === 'string') {
    return [field];
  } else if (Array.isArray(field) && field.length > 0) {
    return field;
  }
  return [];
};

export const getAlertTitle = ({ ruleName }: { ruleName: string | undefined }) => {
  const defaultAlertTitle = i18n.translate(
    'xpack.securitySolution.flyout.right.header.headerTitle',
    { defaultMessage: 'Document details' }
  );
  return ruleName ?? defaultAlertTitle;
};

export const getEventTitle = ({
  eventKind,
  eventCategory,
  getFieldsData,
}: {
  eventKind: string | null;
  eventCategory: string | null;
  getFieldsData: GetFieldsData;
}) => {
  const defaultTitle = i18n.translate('xpack.securitySolution.flyout.title.eventTitle', {
    defaultMessage: `Event details`,
  });

  if (eventKind === 'event' && eventCategory) {
    const fieldName = EVENT_CATEGORY_TO_FIELD[eventCategory];
    return getField(getFieldsData(fieldName)) ?? defaultTitle;
  }

  if (eventKind === 'alert') {
    return i18n.translate('xpack.securitySolution.flyout.title.alertEventTitle', {
      defaultMessage: 'External alert details',
    });
  }

  return eventKind
    ? i18n.translate('xpack.securitySolution.flyout.title.otherEventTitle', {
        defaultMessage: '{eventKind} details',
        values: {
          eventKind: startCase(eventKind),
        },
      })
    : defaultTitle;
};
