import React from 'react';
import type { IndexLifecyclePhaseSelectOption } from '../../../../../common/storage_explorer_types';
interface Props {
    serviceName: string;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}
export declare function StorageDetailsPerService({ serviceName, indexLifecyclePhase }: Props): React.JSX.Element | null;
export {};
