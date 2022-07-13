'use strict';

import { Session } from './session';

// Start a new profile, resolves to a function to stop the profile and resolve
// the profile data.
export async function startProfiling(session: Session): Promise<() => any> {
  session.plugin.logger.debug('starting profile');

  await session.post('Profiler.enable');
  await session.post('Profiler.start');

  // returned function which stops the profile and resolves to the profile data
  return async function stopProfiling() {
    session.plugin.logger.debug('stopping profile');
    const result: any = await session.post('Profiler.stop');
    return result.profile;
  };
}
