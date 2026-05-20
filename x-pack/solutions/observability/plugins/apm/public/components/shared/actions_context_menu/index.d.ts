import React from 'react';
export interface ActionSubItem {
    id: string;
    name: string;
    onClick?: () => void;
    href?: string;
    icon?: string;
}
export interface Action {
    id: string;
    name: string;
    onClick?: () => void;
    href?: string;
    icon?: string;
    items?: ActionSubItem[];
}
export interface ActionGroup {
    id: string;
    groupLabel?: string;
    actions: Action[];
}
export type ActionGroups = ActionGroup[];
interface ActionsContextMenuProps {
    actions: ActionGroups;
    button: React.ReactElement;
    id?: string;
    dataTestSubjPrefix?: string;
}
export declare function ActionsContextMenu({ actions, button, id, dataTestSubjPrefix, }: ActionsContextMenuProps): React.JSX.Element;
export {};
