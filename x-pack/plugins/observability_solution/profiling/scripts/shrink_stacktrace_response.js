/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const commander = require('commander');
const fs = require('fs');

// Reduce response by keeping only one stacktrace event for a given
// depth and adding each count for the remaining stacktrace events to
// the count for that stacktrace event.
//
// This has the effect of reducing the overall response without losing
// sampling fidelity. This should only be used for testing purposes.
//
// For example, given the following stacktrace events, where the key
// represents the name of the stacktrace event and the value is the
// list of frames:
// 1. A => [frame1, frame2, frame3]
// 2. B => [frame1, frame2, frame3]
// 3. C => [frame1, frame2]
// 4. D => [frame1, frame2, frame3]
//
// In the above example, this function will return two events:
// 1. A with a count of 3
// 2. C with a count of 2
function mergeStackTracesByDepth(response) {
  const eventsByFrameDepth = {};

  Object.keys(response.stack_traces).forEach((event) => {
    const numFrames = response.stack_traces[event].frame_ids.length;
    const numEvents = response.stack_trace_events[event];
    if (eventsByFrameDepth[numFrames]) {
      const value = eventsByFrameDepth[numFrames];
      eventsByFrameDepth[numFrames] = {
        event: value.event,
        count: value.count + numEvents,
      };
    } else {
      eventsByFrameDepth[numFrames] = {
        event: event,
        count: numEvents,
      };
    }
  });

  let totalFrames = 0;
  const stackTraceEvents = {};
  const stackTraces = {};

  Object.keys(eventsByFrameDepth).forEach((depth) => {
    const { event, count } = eventsByFrameDepth[depth];
    stackTraces[event] = response.stack_traces[event];
    stackTraceEvents[event] = count;
    totalFrames += stackTraces[event].frame_ids.length * count;
  });

  return {
    stack_trace_events: stackTraceEvents,
    stack_traces: stackTraces,
    stack_frames: response.stack_frames,
    executables: response.executables,
    total_frames: totalFrames,
    sampling_rate: response.sampling_rate,
  };
}

// Remove any stackframes and executables not referenced by the
// stacktraces.
function purgeUnusedFramesAndExecutables(response) {
  const uniqueFileIDs = new Set();
  const uniqueFrameIDs = new Set();

  Object.keys(response.stack_traces).forEach((event) => {
    response.stack_traces[event].file_ids.forEach((fileID) => {
      uniqueFileIDs.add(fileID);
    });
    response.stack_traces[event].frame_ids.forEach((frameID) => {
      uniqueFrameIDs.add(frameID);
    });
  });

  const stackFrames = {};
  [...uniqueFrameIDs].forEach((frameID) => {
    stackFrames[frameID] = response.stack_frames[frameID];
  });

  const executables = {};
  [...uniqueFileIDs].forEach((fileID) => {
    executables[fileID] = response.executables[fileID];
  });

  return {
    stack_trace_events: response.stack_trace_events,
    stack_traces: response.stack_traces,
    stack_frames: stackFrames,
    executables: executables,
    total_frames: response.total_frames,
    sampling_rate: response.sampling_rate,
  };
}

commander.version('0.0.1', '-v, --version').usage('[OPTIONS]...').parse(process.argv);

try {
  const data = fs.readFileSync(process.argv[2], 'utf8');
  const response = JSON.parse(data);
  const mergedResponse = mergeStackTracesByDepth(response);
  const purgedResponse = purgeUnusedFramesAndExecutables(mergedResponse);
  console.log(JSON.stringify(purgedResponse));
} catch (err) {
  console.error(err);
}
