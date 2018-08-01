/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toArray } from 'rxjs/operators';
import { $getClips } from './get_clips';
import { Rectangle } from './types';

function getClipsTest(
  description: string,
  input: { rectangle: Rectangle; max: number },
  expectedClips: { clips: Rectangle[] }
) {
  test(description, async () => {
    const clips = await $getClips(input.rectangle, input.max)
      .pipe(toArray())
      .toPromise();
    expect(clips.length).toBe(expectedClips.clips.length);
    for (let i = 0; i < clips.length; ++i) {
      expect(clips[i]).toEqual(expectedClips.clips[i]);
    }
  });
}

getClipsTest(
  `creates one rect if 0, 0`,
  {
    max: 100,
    rectangle: { x: 0, y: 0, height: 0, width: 0 },
  },
  {
    clips: [{ x: 0, y: 0, height: 0, width: 0 }],
  }
);

getClipsTest(
  `creates one rect if smaller than max`,
  {
    max: 100,
    rectangle: { x: 0, y: 0, height: 99, width: 99 },
  },
  {
    clips: [{ x: 0, y: 0, height: 99, width: 99 }],
  }
);

getClipsTest(
  `create one rect if equal to max`,
  {
    max: 100,
    rectangle: { x: 0, y: 0, height: 100, width: 100 },
  },
  {
    clips: [{ x: 0, y: 0, height: 100, width: 100 }],
  }
);

getClipsTest(
  `creates two rects if width is 1.5 * max`,
  {
    max: 100,
    rectangle: { x: 0, y: 0, height: 100, width: 150 },
  },
  {
    clips: [{ x: 0, y: 0, height: 100, width: 100 }, { x: 100, y: 0, height: 100, width: 50 }],
  }
);

getClipsTest(
  `creates two rects if height is 1.5 * max`,
  {
    max: 100,
    rectangle: { x: 0, y: 0, height: 150, width: 100 },
  },
  {
    clips: [{ x: 0, y: 0, height: 100, width: 100 }, { x: 0, y: 100, height: 50, width: 100 }],
  }
);

getClipsTest(
  `created four rects if height and width is 1.5 * max`,
  {
    max: 100,
    rectangle: { x: 0, y: 0, height: 150, width: 150 },
  },
  {
    clips: [
      { x: 0, y: 0, height: 100, width: 100 },
      { x: 100, y: 0, height: 100, width: 50 },
      { x: 0, y: 100, height: 50, width: 100 },
      { x: 100, y: 100, height: 50, width: 50 },
    ],
  }
);

getClipsTest(
  `creates one rect if height and width is equal to max and theres a y equal to the max`,
  {
    max: 100,
    rectangle: { x: 0, y: 100, height: 100, width: 100 },
  },
  {
    clips: [{ x: 0, y: 100, height: 100, width: 100 }],
  }
);
