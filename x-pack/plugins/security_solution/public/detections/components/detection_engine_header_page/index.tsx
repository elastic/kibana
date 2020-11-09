/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { HeaderPage, HeaderPageProps } from '../../../common/components/header_page';

const DetectionEngineHeaderPageComponent: React.FC<HeaderPageProps> = (props) => (
  <HeaderPage hideSourcerer={true} {...props} />
);

export const DetectionEngineHeaderPage = React.memo(DetectionEngineHeaderPageComponent);

DetectionEngineHeaderPage.displayName = 'DetectionEngineHeaderPage';
