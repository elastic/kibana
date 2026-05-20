import React from 'react';
import type { StagedServiceGroup } from './save_modal';
interface Props {
    serviceGroup: StagedServiceGroup;
    isEdit?: boolean;
    onCloseModal: () => void;
    onSaveClick: (serviceGroup: StagedServiceGroup) => void;
    onEditGroupDetailsClick: () => void;
    isLoading: boolean;
    titleId?: string;
}
export declare function SelectServices({ serviceGroup, isEdit, onCloseModal, onSaveClick, onEditGroupDetailsClick, isLoading, titleId, }: Props): React.JSX.Element;
export {};
