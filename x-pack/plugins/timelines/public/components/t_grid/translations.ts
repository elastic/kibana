/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS_TABLE_ARIA_LABEL = ({
  activePage,
  totalPages,
}: {
  activePage: number;
  totalPages: number;
}) =>
  i18n.translate('xpack.timelines.timeline.eventsTableAriaLabel', {
    values: { activePage, totalPages },
    defaultMessage: 'events; Page {activePage} of {totalPages}',
  });
