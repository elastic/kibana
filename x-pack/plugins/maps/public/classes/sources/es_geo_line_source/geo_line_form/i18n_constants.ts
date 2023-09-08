/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TIME_SERIES_LABEL = i18n.translate(
  'xpack.maps.source.esGeoLine.groupBy.timeseriesLabel',
  {
    defaultMessage: 'Time series',
  }
);

export const TERMS_LABEL = i18n.translate('xpack.maps.source.esGeoLine.groupBy.termsLabel', {
  defaultMessage: 'Top terms',
});

export const ENTITY_INPUT_LABEL = i18n.translate('xpack.maps.source.esGeoLine.splitFieldLabel', {
  defaultMessage: 'Entity',
});

export const SORT_INPUT_LABEL = i18n.translate('xpack.maps.source.esGeoLine.sortFieldLabel', {
  defaultMessage: 'Sort',
});
