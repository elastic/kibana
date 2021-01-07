/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DocLink } from './doc_link';
import * as i18n from './links_translations';

export const SecuritySolutionRequirementsLink = () => (
  <DocLink
    docPath={i18n.SOLUTION_REQUIREMENTS_LINK_PATH}
    linkText={i18n.SOLUTION_REQUIREMENTS_LINK_TEXT}
  />
);

export const DetectionsRequirementsLink = () => (
  <DocLink
    docPath={i18n.DETECTIONS_REQUIREMENTS_LINK_PATH}
    linkText={i18n.DETECTIONS_REQUIREMENTS_LINK_TEXT}
  />
);
