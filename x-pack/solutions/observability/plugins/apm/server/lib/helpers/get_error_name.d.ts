import type { Exception } from '@kbn/apm-types';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import type { ProxiedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/access_known_fields';
export declare function getErrorName<T extends ProxiedApmEvent<Partial<FlattenedApmEvent>>>(event: T, exception: Exception): string;
