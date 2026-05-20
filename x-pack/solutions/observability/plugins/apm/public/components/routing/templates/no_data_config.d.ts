import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
export declare function getNoDataConfig({ docsLink, shouldBypassNoDataScreen, loading, addDataUrl, hasApmData, }: {
    docsLink: string;
    shouldBypassNoDataScreen: boolean;
    loading: boolean;
    addDataUrl: string;
    hasApmData?: boolean;
}): NoDataConfig | undefined;
