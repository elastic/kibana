/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { $getClips } from './get_clips';

function getClipsTest(description, { dimensions, max }, { clips: expectedClips }) {
  test(description, async () => {
    const clips =  await $getClips(dimensions, max).toArray().toPromise();
    expect(clips.length).toBe(expectedClips.length);
    for (let i = 0; i < clips.length; ++i) {
      expect(clips[i]).toEqual(expectedClips[i]);
    }
  });
}

getClipsTest(`creates one rect if 0, 0`,
  {
    dimensions: { x: 0, y: 0, height: 0, width: 0 },
    max: 100,
  },
  {
    clips: [{ x: 0, y: 0, height: 0, width: 0 }],
  }
);

getClipsTest(`creates one rect if smaller than max`,
  {
    dimensions: { x: 0, y: 0, height: 99, width: 99 },
    max: 100,
  },
  {
    clips: [{ x: 0, y: 0, height: 99, width: 99 }],
  }
);

getClipsTest(`create one rect if equal to max`,
  {
    dimensions: { x: 0, y: 0, height: 100, width: 100 },
    max: 100,
  },
  {
    clips: [{ x: 0, y: 0, height: 100, width: 100 }],
  }
);

getClipsTest(`creates two rects if width is 1.5 * max`,
  {
    dimensions: { x: 0, y: 0, height: 100, width: 150 },
    max: 100,
  },
  {
    clips: [
      { x: 0, y: 0, height: 100, width: 100 },
      { x: 100, y: 0, height: 100, width: 50 }
    ],
  }
);

getClipsTest(`creates two rects if height is 1.5 * max`,
  {
    dimensions: { x: 0, y: 0, height: 150, width: 100 },
    max: 100,
  },
  {
    clips: [
      { x: 0, y: 0, height: 100, width: 100 },
      { x: 0, y: 100, height: 50, width: 100 }
    ],
  }
);

getClipsTest(`created four rects if height and width is 1.5 * max`,
  {
    dimensions: { x: 0, y: 0, height: 150, width: 150 },
    max: 100,
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

getClipsTest(`creates one rect if height and width is equal to max and theres a y equal to the max`,
  {
    dimensions: { x: 0, y: 100, height: 100, width: 100 },
    max: 100,
  },
  {
    clips: [
      { x: 0, y: 100, height: 100, width: 100 },
    ],
  }
);