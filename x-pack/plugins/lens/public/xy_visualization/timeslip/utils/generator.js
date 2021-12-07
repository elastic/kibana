/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const toCallbackFn = (generatorObject) => {
  generatorObject.next(); // this starts the generator object, eg. resulting in initial render without any events
  return (event) => generatorObject.next(event);
};

export const observe = (eventTarget, commonHandler, handlers) => {
  for (const eventName in handlers)
    eventTarget.addEventListener(eventName, commonHandler, { passive: false });
  // the returned function allows the removal of the event listeners if needed
  return () => {
    for (const eventName in handlers) eventTarget.removeEventListener(eventName, commonHandler);
  };
};
