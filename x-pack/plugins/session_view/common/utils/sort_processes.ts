import { Process } from '../types/process_tree';

export const sortProcesses = (a: Process, b: Process) => {
  const eventA = a.getDetails();
  const eventB = b.getDetails();

  if (eventA.process.start < eventB.process.start) {
    return -1;
  }

  if (eventA.process.start > eventB.process.start) {
    return 1;
  }

  return 0;
}
