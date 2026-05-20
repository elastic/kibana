import React from 'react';
import type { StagedServiceGroup } from './save_modal';
interface Props {
    serviceGroup?: StagedServiceGroup;
    isEdit?: boolean;
    onCloseModal: () => void;
    onClickNext: (serviceGroup: StagedServiceGroup) => void;
    onDeleteGroup: () => void;
    isLoading: boolean;
    titleId?: string;
}
export declare function GroupDetails({ isEdit, serviceGroup, onCloseModal, onClickNext, onDeleteGroup, isLoading, titleId, }: Props): React.JSX.Element;
export {};
