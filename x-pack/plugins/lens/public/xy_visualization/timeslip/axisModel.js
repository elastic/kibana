/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const getNiceTicksForApproxCount = (domainMin, domainMax, approxDesiredTickCount) => {
  const diff = domainMax - domainMin;
  const rawPitch = diff / approxDesiredTickCount;
  const exponent = Math.floor(Math.log10(rawPitch));
  const orderOfMagnitude = 10 ** exponent; // this represents the order of magnitude eg. 10000, so that...
  const mantissa = rawPitch / orderOfMagnitude; // it's always the case that 1 <= mantissa <= 9.99999999999
  const niceMantissa = mantissa > 5 ? 10 : mantissa > 2 ? 5 : mantissa > 1 ? 2 : 1; // snap to 10, 5, 2 or 1
  const tickInterval = niceMantissa * orderOfMagnitude;
  if (!isFinite(tickInterval)) {
    return [];
  }
  const result = [];
  for (
    let i = Math.floor(domainMin / tickInterval);
    i <= Math.ceil(domainMax / tickInterval);
    i++
  ) {
    result.push(i * tickInterval);
  }
  return result;
};

const getNiceTicks = (domainMin, domainMax, maximumTickCount) => {
  let bestCandidate = [];
  for (let i = 0; i <= maximumTickCount; i++) {
    const candidate = getNiceTicksForApproxCount(domainMin, domainMax, maximumTickCount - i);
    if (candidate.length <= maximumTickCount && candidate.length > 0) {
      return candidate;
    }
    if (
      bestCandidate.length === 0 ||
      maximumTickCount - candidate.length < maximumTickCount - bestCandidate.length
    ) {
      bestCandidate = candidate;
    }
  }
  return bestCandidate.length > maximumTickCount
    ? [...(maximumTickCount > 1 ? [bestCandidate[0]] : []), bestCandidate[bestCandidate.length - 1]]
    : [];
};

export const axisModel = (domainLandmarks, desiredTickCount) => {
  const domainMin = Math.min(...domainLandmarks);
  const domainMax = Math.max(...domainLandmarks);
  const niceTicks = getNiceTicks(domainMin, domainMax, desiredTickCount);
  const niceDomainMin = niceTicks.length >= 2 ? niceTicks[0] : domainMin;
  const niceDomainMax = niceTicks.length >= 2 ? niceTicks[niceTicks.length - 1] : domainMax;
  return { niceDomainMin, niceDomainMax, niceTicks };
};
