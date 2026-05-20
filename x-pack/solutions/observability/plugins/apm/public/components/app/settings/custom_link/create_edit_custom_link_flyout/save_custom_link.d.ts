import type { NotificationsStart } from '@kbn/core/public';
import type { Filter } from '../../../../../../common/custom_link/custom_link_types';
export declare function saveCustomLink({ id, label, url, filters, toasts, }: {
    id?: string;
    label: string;
    url: string;
    filters: Filter[];
    toasts: NotificationsStart['toasts'];
}): Promise<void>;
