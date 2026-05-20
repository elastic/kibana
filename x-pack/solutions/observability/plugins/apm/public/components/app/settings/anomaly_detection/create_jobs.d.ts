import type { NotificationsStart } from '@kbn/core/public';
export declare function createJobs({ environments, toasts, }: {
    environments: string[];
    toasts: NotificationsStart['toasts'];
}): Promise<boolean>;
