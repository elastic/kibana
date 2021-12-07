/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDesiredTickCount = (cartesianHeight, fontSize, sparse) => {
  const desiredMaxTickCount = Math.floor(cartesianHeight / (3 * fontSize));
  return sparse
    ? 1 + Math.ceil(Math.pow(desiredMaxTickCount, 0.25))
    : 1 + Math.ceil(Math.sqrt(desiredMaxTickCount));
};

export const axisScale = (niceDomainMin, niceDomainMax) => {
  const niceDomainExtent = niceDomainMax - niceDomainMin;
  const yScaleMultiplier = 1 / (niceDomainExtent || 1);
  const offset = -niceDomainMin * yScaleMultiplier;
  return (d) => offset + d * yScaleMultiplier;
};
