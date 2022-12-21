/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

export const HeatmapLayerIcon: FunctionComponent = () => (
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
      fillRule="evenodd"
      d="M29.012 20.309a10.393 10.393 0 01-6.608 2.359c-1.134 0-2.225-.181-3.247-.515a8.322 8.322 0 11-6.005-14.747A10.433 10.433 0 0122.404 1.8c3.973 0 7.428 2.222 9.19 5.49a8.322 8.322 0 11-2.582 13.019z"
      clipRule="evenodd"
      opacity="0.8"
    />
    <circle cx="35.741" cy="14.778" r="3.989" className="mapLayersWizardIcon__highlight" />
    <path
      className="mapLayersWizardIcon__highlight"
      fillRule="evenodd"
      d="M20.021 16.957c-1.199-.773-2.221-.518-3.224.826-.896 1.2-2.587 1.272-3.963.482-1.332-.764-1.843-2.084-1.403-3.62.447-1.558 1.517-2.379 3.084-2.365 1.676.015 1.886-.16 2.496-1.863.8-2.235 2.274-3.8 4.704-4.07 2.266-.252 4.174.556 5.41 2.574 1.323 2.158 1.17 4.623-.348 6.462-1.65 1.998-3.962 2.574-6.756 1.574z"
      clipRule="evenodd"
    />
  </svg>
);
