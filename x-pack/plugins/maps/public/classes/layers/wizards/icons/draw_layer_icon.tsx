/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

export const DrawLayerIcon: FunctionComponent = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="49"
    height="25"
    fill="none"
    viewBox="0 0 49 25"
    className="mapLayersWizardIcon"
  >
    <path
      className="mapLayersWizardIcon__background"
      d="M12.281 3l-6.625 7.625 1.657 8.938 35.218-.813v-13l-10.625-3.5-9.781 9.5L12.281 3z"
    />
    <path
      className="mapLayersWizardIcon__highlight"
      fillRule="evenodd"
      d="M31.775 1.68l11.256 3.708v13.85l-36.133.834-1.777-9.593 7.114-8.189 9.875 8.778 9.665-9.388zm.262 1.14l-9.897 9.612-9.813-8.722-6.135 7.06 1.535 8.283 34.304-.792V6.111L32.037 2.82z"
      clipRule="evenodd"
    />
    <circle cx="7.281" cy="19.5" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="5.656" cy="10.25" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="12.156" cy="3.625" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="22" cy="11.6" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="31.969" cy="2.5" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="42.344" cy="6.125" r="2.5" className="mapLayersWizardIcon__highlight" />
    <circle cx="42.344" cy="19" r="2.5" className="mapLayersWizardIcon__highlight" />
  </svg>
);
