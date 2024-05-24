import { deepCopy } from './util';

interface Pipeline {
  processors: any[];
}

export function combineProcessors(initialPipeline: Pipeline, processors: any[]): Pipeline {
  // Create a deep copy of the initialPipeline to avoid modifying the original input
  const currentPipeline = deepCopy(initialPipeline);

  // Access and modify the processors list in the copied pipeline
  const currentProcessors = currentPipeline.processors;
  const combinedProcessors = [
    ...currentProcessors.slice(0, -1),
    ...processors,
    ...currentProcessors.slice(-1),
  ];
  currentPipeline.processors = combinedProcessors;

  return currentPipeline;
}
