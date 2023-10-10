import { logger } from './logger';
export async function wait (delay: number) {
  logger.info(`Waiting ${delay}ms`);
  await new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
