import { Doc, EventFunction } from '../../../../../types';
import { ADMIN_CONSOLE, ADMIN_CONSOLE_HOSTS } from '../../../common/constants';

export const createStartupEvents: EventFunction = (_schedule, timestamp) => ADMIN_CONSOLE_HOSTS.reduce((acc, name) => {
  const events = [
    {
      namespace: ADMIN_CONSOLE,
      '@timestamp': timestamp.toISOString(),
      tags: [`infra:${ADMIN_CONSOLE}`],
      event: {
        action: 'startup',
        category: 'initialization'
      },
      message: 'Admin console starting up...',
      host: { name },
      log: {
        level: 'INFO',
        logger: ADMIN_CONSOLE
      }
    }
  ];
  return [...acc, ...events];
}, [] as Doc[]);

