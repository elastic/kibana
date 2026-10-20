/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface StageFit {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

const NO_FIT: StageFit = { scale: 1, offsetX: 0, offsetY: 0 };

const isUsable = ({ width, height }: Size): boolean =>
  Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

/** Scales the recorded viewport down to fit its container, centred, and never scales it up. */
export const computeStageFit = ({
  container,
  viewport,
}: {
  container: Size;
  viewport: Size;
}): StageFit => {
  if (!isUsable(container) || !isUsable(viewport)) {
    return NO_FIT;
  }
  const scale = Math.min(container.width / viewport.width, container.height / viewport.height, 1);
  return {
    scale,
    offsetX: (container.width - viewport.width * scale) / 2,
    offsetY: (container.height - viewport.height * scale) / 2,
  };
};
