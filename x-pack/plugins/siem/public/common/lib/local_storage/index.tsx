/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const LOCAL_STORAGE_TIMELINE_KEY = 'timelines';

const getItem = (id: string) => JSON.parse(localStorage.getItem(id) ?? `{}`);

const setItem = (id: string, item: unknown) => localStorage.setItem(id, JSON.stringify(item));

const getAllTimelines = () => {
  return getItem(LOCAL_STORAGE_TIMELINE_KEY);
};

const addTimeline = (id: string, timeline: unknown) => {
  const timelines = getAllTimelines();
  setItem(LOCAL_STORAGE_TIMELINE_KEY, {
    ...timelines,
    [id]: timeline,
  });
};

export { getItem, setItem, getAllTimelines, addTimeline };
