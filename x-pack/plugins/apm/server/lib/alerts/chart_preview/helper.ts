/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';

const BUCKET_SIZE = 20;

export function getIntervalAndTimeRange({
  windowSize,
  windowUnit,
}: {
  windowSize: number;
  windowUnit: string;
}) {
  const start = datemath
    .parse(`now-${windowSize * BUCKET_SIZE}${windowUnit}`)
    ?.valueOf();

  if (!start) {
    throw Boom.internal(
      i18n.translate('xpack.apm.api.alert.chartPreview.invalidWindow', {
        defaultMessage: `Invalid window {windowSize} {windowUnit}`,
        values: { windowSize, windowUnit },
      })
    );
  }

  return {
    interval: `${windowSize}${windowUnit}`,
    start,
    end: new Date().valueOf(),
  };
}
