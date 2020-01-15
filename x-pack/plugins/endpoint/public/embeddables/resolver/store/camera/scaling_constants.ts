/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * The minimum allowed value for the camera scale. This is the least scale that we will ever render something at.
 */
export const minimum = 0.1;

/**
 * The maximum allowed value for the camera scale. This is greatest scale that we will ever render something at.
 */
export const maximum = 6;

/**
 * The curve of the zoom function growth rate. The higher the scale factor is, the higher the zoom rate will be.
 */
export const zoomCurveRate = 4;
