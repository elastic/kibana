import React from 'react';
import type { BoolQuery } from '@kbn/es-query';
import type { Environment } from '../../../../common/environment_rt';
export declare function ServiceMapHome(): React.JSX.Element;
export declare function ServiceMapServiceDetail(): React.JSX.Element;
export declare function ServiceMap({ environment, kuery, start, end, serviceGroupId, esQuery, }: {
    environment: Environment;
    kuery: string;
    start: string;
    end: string;
    serviceGroupId?: string;
    esQuery?: {
        bool: BoolQuery;
    };
}): React.JSX.Element | null;
