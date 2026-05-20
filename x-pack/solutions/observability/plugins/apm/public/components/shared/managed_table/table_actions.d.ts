import type { ActionGroups } from '../actions_context_menu';
export interface TableActionItem<T> {
    id: string;
    name: string;
    onClick?: (item: T) => void;
    href?: (item: T) => string | undefined;
    icon?: string;
}
export type TableActionSubItem<T> = TableActionItem<T>;
export interface TableAction<T> extends TableActionItem<T> {
    items?: Array<TableActionSubItem<T>>;
}
export interface TableActionGroup<T> {
    id: string;
    groupLabel?: string;
    actions: Array<TableAction<T>>;
}
export type TableActions<T> = Array<TableActionGroup<T>>;
export declare function resolveTableActions<T>(actions: TableActions<T>, item: T): ActionGroups;
