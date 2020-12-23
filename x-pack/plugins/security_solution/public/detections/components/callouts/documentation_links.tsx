/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ExternalLink } from './external_link';

export const SecuritySolutionRequirementsLink = () => (
  <ExternalLink
    url="https://www.elastic.co/guide/en/security/current/sec-requirements.html"
    text="Elastic Security system requirements"
  />
);

export const DetectionsRequirementsLink = () => (
  <ExternalLink
    url="https://www.elastic.co/guide/en/security/current/detections-permissions-section.html"
    text="Detections prerequisites and requirements"
  />
);
