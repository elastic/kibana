import type { Breadcrumb } from './context';
export declare function useBreadcrumb(callback: () => Breadcrumb | Breadcrumb[], fnDeps: any[], options?: {
    omitRootOnServerless?: boolean;
    omitOnServerless?: boolean;
}): void;
