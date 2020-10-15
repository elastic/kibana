/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

export const ANIMATION_SWITCH_DELAY_MS = 1000;

// custom hook to enable the card split animation of the cards 1 second after the component has been rendered
// then switching to a step which contains the cards, the animation shouldn't play, instead
// the cards should be initially rendered in the split state.
// all subsequent changes to the split should be animated.

export function useAnimateSplit() {
  const [animateSplit, setAnimateSplit] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setAnimateSplit(true);
    }, ANIMATION_SWITCH_DELAY_MS);
  }, []);

  return animateSplit;
}
