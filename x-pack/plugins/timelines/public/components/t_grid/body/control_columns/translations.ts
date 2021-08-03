/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const CHECKBOX_FOR_ROW = ({
  ariaRowindex,
  columnValues,
  checked,
}: {
  ariaRowindex: number;
  columnValues: string;
  checked: boolean;
}) =>
  i18n.translate('xpack.timelines.timeline.body.actions.checkboxForRowAriaLabel', {
    values: { ariaRowindex, checked, columnValues },
    defaultMessage:
      '{checked, select, false {unchecked} true {checked}} checkbox for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });
