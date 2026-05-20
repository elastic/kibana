import type { ReactNode } from 'react';
import React from 'react';
import type { Observable } from 'rxjs';
import type { ITelemetryClient } from '../../services/telemetry/types';
import type { APMServiceContextValue } from '../apm_service/apm_service_context';
import type { ApmPluginContextValue } from './apm_plugin_context';
export declare const mockCore: {
    application: {
        capabilities: {
            apm: {};
            ml: {};
            slo: {
                read: boolean;
            };
            savedObjectsManagement: {};
            dashboard_v2: {
                show: boolean;
            };
        };
        currentAppId$: Observable<unknown>;
        getUrlForApp: (appId: string) => string;
        navigateToUrl: (url: string) => void;
    };
    chrome: {
        docTitle: {
            change: () => void;
        };
        setBreadcrumbs: () => void;
        setHelpExtension: () => void;
        setBadge: () => void;
    };
    docLinks: {
        DOC_LINK_VERSION: string;
        ELASTIC_WEBSITE_URL: string;
        links: {
            apm: {};
            observability: {
                guide: string;
            };
            security: {
                apiKeyServiceSettings: string;
            };
        };
    };
    http: {
        basePath: {
            prepend: (path: string) => string;
            get: () => string;
        };
        get: (pathname: string, options?: any) => Promise<any>;
        post: (pathname: string, options?: any) => Promise<any>;
        put: (pathname: string, options?: any) => Promise<any>;
        delete: (pathname: string, options?: any) => Promise<any>;
        patch: (pathname: string, options?: any) => Promise<any>;
    };
    i18n: {
        Context: ({ children }: {
            children: ReactNode;
        }) => ReactNode;
    };
    notifications: {
        toasts: {
            addWarning: () => void;
            addDanger: () => void;
            add: () => void;
        };
    };
    uiSettings: {
        get: (key: string) => unknown;
        get$: (key: string) => Observable<unknown>;
    };
    unifiedSearch: {
        autocomplete: {
            hasQuerySuggestions: () => Promise<boolean>;
            getQuerySuggestions: () => never[];
            getValueSuggestions: () => Promise<unknown>;
        };
    };
    data: {
        query: {
            queryString: {
                getQuery: jest.Mock<any, any, any>;
                setQuery: jest.Mock<any, any, any>;
                clearQuery: jest.Mock<any, any, any>;
            };
            timefilter: {
                timefilter: {
                    setTime: jest.Mock<any, any, any>;
                    setRefreshInterval: jest.Mock<any, any, any>;
                };
            };
        };
    };
    dataViews: {
        create: jest.Mock<any, any, any>;
    };
};
/** Satisfies `useKibana` consumers (e.g. service map) that read `services.telemetry`. */
export declare const storybookTelemetry: ITelemetryClient;
export declare const mockApmPluginContext: ApmPluginContextValue;
export declare function MockApmPluginStorybook({ children, apmContext, routePath, serviceContextValue, }: {
    children?: ReactNode;
    routePath?: string;
    apmContext?: ApmPluginContextValue;
    serviceContextValue?: APMServiceContextValue;
}): React.JSX.Element;
