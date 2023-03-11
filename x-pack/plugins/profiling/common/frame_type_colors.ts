/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FrameType } from './profiling';

/*
 * Helper to calculate the color of a given block to be drawn. The desirable outcomes of this are:
 * Each of the following frame types should get a different set of color hues:
 *
 *   0 = Unsymbolized frame
 *   1 = Python
 *   2 = PHP
 *   3 = Native
 *   4 = Kernel
 *   5 = JVM/Hotspot
 *   6 = Ruby
 *   7 = Perl
 *   8 = JavaScript
 *   9 = PHP JIT
 *
 * This is most easily achieved by mapping frame types to different color variations, using
 * the x-position we can use different colors for adjacent blocks while keeping a similar hue
 *
 * Taken originally from prodfiler_ui/src/helpers/Pixi/frameTypeToColors.tsx
 */
export const FRAME_TYPE_COLOR_MAP = {
  [FrameType.Unsymbolized]: [0xfd8484, 0xfd9d9d, 0xfeb5b5, 0xfecece],
  [FrameType.Python]: [0xfcae6b, 0xfdbe89, 0xfdcea6, 0xfedfc4],
  [FrameType.PHP]: [0xfcdb82, 0xfde29b, 0xfde9b4, 0xfef1cd],
  [FrameType.Native]: [0x6dd0dc, 0x8ad9e3, 0xa7e3ea, 0xc5ecf1],
  [FrameType.Kernel]: [0x7c9eff, 0x96b1ff, 0xb0c5ff, 0xcbd8ff],
  [FrameType.JVM]: [0x65d3ac, 0x84dcbd, 0xa3e5cd, 0xc1edde],
  [FrameType.Ruby]: [0xd79ffc, 0xdfb2fd, 0xe7c5fd, 0xefd9fe],
  [FrameType.Perl]: [0xf98bb9, 0xfaa2c7, 0xfbb9d5, 0xfdd1e3],
  [FrameType.JavaScript]: [0xcbc3e3, 0xd5cfe8, 0xdfdbee, 0xeae7f3],
  [FrameType.PHPJIT]: [0xccfc82, 0xd1fc8e, 0xd6fc9b, 0xdbfca7],
};

export function frameTypeToRGB(frameType: FrameType, x: number): number {
  return FRAME_TYPE_COLOR_MAP[frameType][x % 4];
}

export function rgbToRGBA(rgb: number): number[] {
  return [
    Math.floor(rgb / 65536) / 255,
    (Math.floor(rgb / 256) % 256) / 255,
    (rgb % 256) / 255,
    1.0,
  ];
}
