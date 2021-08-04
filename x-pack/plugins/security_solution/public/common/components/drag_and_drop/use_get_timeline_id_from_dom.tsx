/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { SELECTOR_TIMELINE_GLOBAL_CONTAINER } from '../../../timelines/components/timeline/styles';

export const useGetTimelineId = function (
  elem: React.MutableRefObject<Element | null>,
  getTimelineId: boolean = false
) {
  const [timelineId, setTimelineId] = useState<string | null>(null);

  useEffect(() => {
    let startElem: Element | (Node & ParentNode) | null = elem.current;
    if (startElem != null && getTimelineId) {
      for (; startElem && startElem !== document; startElem = startElem.parentNode) {
        const myElem: Element = startElem as Element;
        if (
          myElem != null &&
          myElem.classList != null &&
          myElem.classList.contains(SELECTOR_TIMELINE_GLOBAL_CONTAINER) &&
          myElem.hasAttribute('data-timeline-id')
        ) {
          setTimelineId(myElem.getAttribute('data-timeline-id'));
          break;
        }
      }
    }
  }, [elem, getTimelineId]);

  return timelineId;
};
