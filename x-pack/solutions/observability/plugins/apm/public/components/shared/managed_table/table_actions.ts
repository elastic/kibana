/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export function resolveTableActions<T>(actions: TableActions<T>, item: T): ActionGroups {
  return actions.map((group) => ({
    id: group.id,
    groupLabel: group.groupLabel,
    actions: group.actions.map((action) => ({
      id: action.id,
      name: action.name,
      icon: action.icon,
      onClick: action.onClick ? () => action.onClick!(item) : undefined,
      href: action.href ? action.href(item) : undefined,
      items: action.items?.map((subItem) => ({
        id: subItem.id,
        name: subItem.name,
        icon: subItem.icon,
        onClick: subItem.onClick ? () => subItem.onClick!(item) : undefined,
        href: subItem.href ? subItem.href(item) : undefined,
      })),
    })),
  }));
}
