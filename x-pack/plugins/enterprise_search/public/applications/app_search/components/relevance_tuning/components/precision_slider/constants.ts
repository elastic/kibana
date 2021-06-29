/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const STEP_01_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step01.description',
  {
    defaultMessage: 'Lowest precision and highest recall setting.',
  }
);

const STEP_02_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step02.description',
  {
    defaultMessage: 'Default. High recall, low precision.',
  }
);

const STEP_03_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step03.description',
  {
    defaultMessage: 'Increasing phrase matching: half the terms.',
  }
);

const STEP_04_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step04.description',
  {
    defaultMessage: 'Increasing phrase matching: three-quarters of the terms.',
  }
);

const STEP_05_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step05.description',
  {
    defaultMessage: 'Increasing phrase matching requirements: all but one of the terms.',
  }
);

const STEP_06_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step06.description',
  {
    defaultMessage: 'All terms must match.',
  }
);

const STEP_07_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step07.description',
  {
    defaultMessage:
      'The strictest phrase matching requirement: all terms must match, and in the same field.',
  }
);

const STEP_08_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step08.description',
  {
    defaultMessage: 'Decreasing typo tolerance: advanced typo tolerance is disabled.',
  }
);

const STEP_09_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step09.description',
  {
    defaultMessage: 'Decreasing term matching: prefixing is disabled.',
  }
);

const STEP_10_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step10.description',
  {
    defaultMessage: 'Decreasing typo-tolerance: no compound-word correction.',
  }
);

const STEP_11_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.step11.description',
  {
    defaultMessage: 'Exact spelling matches only.',
  }
);

export const STEP_DESCRIPTIONS = [
  undefined, // The precision number we get from the API starts with 1 instead of 0, so we leave this blank
  STEP_01_DESCRIPTION,
  STEP_02_DESCRIPTION,
  STEP_03_DESCRIPTION,
  STEP_04_DESCRIPTION,
  STEP_05_DESCRIPTION,
  STEP_06_DESCRIPTION,
  STEP_07_DESCRIPTION,
  STEP_08_DESCRIPTION,
  STEP_09_DESCRIPTION,
  STEP_10_DESCRIPTION,
  STEP_11_DESCRIPTION,
];
