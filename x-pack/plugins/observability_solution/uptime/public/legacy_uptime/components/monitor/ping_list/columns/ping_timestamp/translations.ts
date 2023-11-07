/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const prevAriaLabel = i18n.translate('xpack.uptime.synthetics.prevStepButton.airaLabel', {
  defaultMessage: 'Previous step',
});

export const nextAriaLabel = i18n.translate('xpack.uptime.synthetics.nextStepButton.ariaLabel', {
  defaultMessage: 'Next step',
});

export const imageLoadingSpinnerAriaLabel = i18n.translate(
  'xpack.uptime.synthetics.imageLoadingSpinner.ariaLabel',
  {
    defaultMessage: 'An animated spinner indicating the image is loading',
  }
);

export const fullSizeImageAlt = i18n.translate('xpack.uptime.synthetics.thumbnail.fullSize.alt', {
  defaultMessage: `A larger version of the screenshot for this journey step's thumbnail.`,
});

export const formatCaptionContent = (stepNumber: number, totalSteps?: number) =>
  i18n.translate('xpack.uptime.synthetics.pingTimestamp.captionContent', {
    defaultMessage: 'Step: {stepNumber} of {totalSteps}',
    values: {
      stepNumber,
      totalSteps,
    },
  });
