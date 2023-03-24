/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import * as i18n from '../translations';
import { EndsOptions, Frequency } from '../constants';

const { emptyField } = fieldValidators;

export interface FormProps {
  title: string;
  date: string;
  duration: number;
  recurring: boolean;
  recurringSchedule?: RecurringScheduleFormProps;
}

export interface RecurringScheduleFormProps {
  frequency: Frequency | 'CUSTOM';
  interval?: number;
  ends: string;
  until?: string;
  count?: number;
  customFrequency?: Frequency;
  byweekday?: Record<string, boolean>;
  bymonth?: string;
}

export const schema: FormSchema<FormProps> = {
  title: {
    type: FIELD_TYPES.TEXT,
    label: i18n.CREATE_FORM_NAME,
    validations: [
      {
        validator: emptyField(i18n.CREATE_FORM_NAME_REQUIRED),
      },
    ],
  },
  date: {
    label: i18n.CREATE_FORM_DATE_AND_TIME,
    defaultValue: moment().toISOString(),
    validations: [],
  },
  duration: {
    type: FIELD_TYPES.TEXT,
    label: i18n.CREATE_FORM_DURATION,
    validations: [
      {
        validator: emptyField(i18n.CREATE_FORM_DURATION_REQUIRED),
      },
    ],
  },
  recurring: {
    type: FIELD_TYPES.TOGGLE,
    label: i18n.CREATE_FORM_RECURRING,
    defaultValue: false,
  },
  recurringSchedule: {
    frequency: {
      type: FIELD_TYPES.SELECT,
      label: i18n.CREATE_FORM_REPEAT,
      defaultValue: Frequency.DAILY,
    },
    interval: {
      type: FIELD_TYPES.TEXT,
      label: ' ',
      defaultValue: 1,
      validations: [
        {
          validator: emptyField(i18n.CREATE_FORM_INTERVAL_REQUIRED),
        },
      ],
    },
    ends: {
      label: i18n.CREATE_FORM_ENDS,
      defaultValue: EndsOptions.NEVER,
      validations: [],
    },
    until: {
      label: ' ',
      defaultValue: moment().endOf('day').toISOString(),
      validations: [],
    },
    count: {
      label: ' ',
      type: FIELD_TYPES.TEXT,
      defaultValue: 1,
      validations: [
        {
          validator: emptyField(i18n.CREATE_FORM_COUNT_REQUIRED),
        },
      ],
    },
    customFrequency: {
      type: FIELD_TYPES.SELECT,
      label: '',
      defaultValue: Frequency.WEEKLY,
    },
    byweekday: {},
    bymonth: {},
  },
};
