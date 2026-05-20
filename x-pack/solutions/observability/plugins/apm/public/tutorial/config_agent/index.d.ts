import React from 'react';
import type { CustomComponentProps } from '@kbn/home-plugin/public';
import type { APIReturnType } from '../../services/rest/create_call_apm_api';
export type APIResponseType = APIReturnType<'GET /internal/apm/fleet/agents'>;
export declare function TutorialConfigAgent({ variantId, http, basePath, isCloudEnabled, kibanaVersion, }: Pick<CustomComponentProps, 'variantId' | 'http' | 'basePath' | 'isCloudEnabled' | 'kibanaVersion'>): React.JSX.Element;
