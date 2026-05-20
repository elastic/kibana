import React from 'react';
import type { ServiceGroup, SavedServiceGroup } from '../../../../../common/service_groups';
interface Props {
    onClose: () => void;
    savedServiceGroup?: SavedServiceGroup;
}
export type StagedServiceGroup = Pick<ServiceGroup, 'groupName' | 'color' | 'description' | 'kuery'>;
export declare function SaveGroupModal({ onClose, savedServiceGroup }: Props): React.JSX.Element;
export {};
