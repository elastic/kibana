/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const POLL_INTERVAL = 10000;

export const startPoll = ({
  pollAction,
  interval,
  shouldStop,
  stopAction,
}: {
  pollAction: () => void;
  interval: number;
  shouldStop: () => boolean;
  stopAction: () => void;
}) => {
  function sleep() {
    return new Promise((resolve) => setTimeout(resolve, interval));
  }
  const executePoll = async () => {
    while (true) {
      await sleep();
      if (shouldStop()) {
        stopAction();
        break;
      } else {
        pollAction();
      }
    }
  };

  executePoll();
};
