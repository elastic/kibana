/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

let spacesFeatureDescription: string;

export const getSpacesFeatureDescription = () => {
  if (!spacesFeatureDescription) {
    spacesFeatureDescription = i18n.translate('xpack.spaces.featureDescription', {
      defaultMessage:
        'Organize your dashboards and other saved objects into meaningful categories.',
    });
  }

  return spacesFeatureDescription;
};

export const DEFAULT_OBJECT_NOUN = i18n.translate('xpack.spaces.shareToSpace.objectNoun', {
  defaultMessage: 'object',
});
