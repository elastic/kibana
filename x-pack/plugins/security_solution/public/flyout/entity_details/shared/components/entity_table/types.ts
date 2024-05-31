/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { XOR } from '../../../../../../common/utility_types';

export type EntityTableRow<T extends BasicEntityData> = XOR<
  {
    label: string;
    /**
     * The field name. It is used for displaying CellActions.
     */
    field: string;
    /**
     * It extracts an array of strings from the data. Each element is a valid field value.
     * It is used for displaying MoreContainer.
     */
    getValues: (data: T) => string[] | null | undefined;
    /**
     * It allows the customization of the rendered field.
     * The element is still rendered inside `DefaultFieldRenderer` getting `CellActions` and `MoreContainer` capabilities.
     */
    renderField?: (value: string) => JSX.Element;
    /**
     * It hides the row when `isVisible` returns false.
     */
    isVisible?: (data: T) => boolean;
  },
  {
    label: string;
    /**
     * It takes complete control over the rendering.
     * `getValues` and `renderField` are not called when this property is used.
     */
    render: (data: T) => JSX.Element;
    /**
     * It hides the row when `isVisible` returns false.
     */
    isVisible?: (data: T) => boolean;
  }
>;

export type EntityTableColumns<T extends BasicEntityData> = Array<
  EuiBasicTableColumn<EntityTableRow<T>>
>;
export type EntityTableRows<T extends BasicEntityData> = Array<EntityTableRow<T>>;

export interface BasicEntityData {
  isLoading: boolean;
}
