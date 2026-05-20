import React from 'react';
import type { CSSObject } from '@emotion/react';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { Environment } from '../../../../common/environment_rt';
export declare function EnvironmentSelect({ environment, availableEnvironments, status, serviceName, rangeFrom, rangeTo, onChange, fullWidth: fullWidthProp, compressed, hideLabel, cssOverride, }: {
    environment: Environment;
    availableEnvironments: Environment[];
    status: FETCH_STATUS;
    serviceName?: string;
    rangeFrom: string;
    rangeTo: string;
    onChange: (value: string) => void;
    fullWidth?: boolean;
    compressed?: boolean;
    hideLabel?: boolean;
    cssOverride?: CSSObject;
}): React.JSX.Element;
