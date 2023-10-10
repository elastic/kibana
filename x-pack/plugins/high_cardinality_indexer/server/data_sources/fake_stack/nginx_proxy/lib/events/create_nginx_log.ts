import { faker } from "@faker-js/faker";
import { memoize, sample } from "lodash";
import { Moment } from "moment";
import { NGINX_PROXY, NGINX_PROXY_HOSTS } from "../../../common/constants";
import { createNginxTimestamp } from "../create_nginx_timestamp";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getClientIp = memoize((userId: string) => {
  return faker.internet.ip();
});

export const createNginxLog = (timestamp: Moment, method: string, statusCode: number, bytes: number, path: string, url: string, userAgent: string, domain: string, hostWithPort: string, userId: string) => {
  const host = sample(NGINX_PROXY_HOSTS) as string;
  return [{
    namespace: NGINX_PROXY,
    '@timestamp': timestamp.toISOString(),
    message: `[${createNginxTimestamp(timestamp)}] ${getClientIp(userId)} - ${userId} ${domain} to: ${hostWithPort}: "${method} ${path} HTTP/1.1" ${statusCode} ${bytes} "${url}" "${userAgent}"`,
    log: { level: 'INFO', logger: NGINX_PROXY },
    host: { name: host },
  }];
};
