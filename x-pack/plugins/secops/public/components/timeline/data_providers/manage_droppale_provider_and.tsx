/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { DataProvider } from './data_provider';

export interface ItemAnd {
  dataProvider: DataProvider;
  width: number;
}

export interface ManageDropProviderAndArgs {
  isDraggingOver: boolean;
  itemsAnd: ItemAnd[];
  setIsDraggingOver: (isDraggingOver: boolean) => void;
  setItemAnd: (dataprovider: DataProvider, width: number) => void;
  deleteItemAnd: (providerId: string) => void;
}

interface ManageDropProviderAndProps {
  children: (args: ManageDropProviderAndArgs) => React.ReactNode;
}

interface ManageDropProviderAndState {
  itemsAnd: ItemAnd[];
  isDraggingOver: boolean;
}

export class ManageDropProviderAnd extends React.PureComponent<
  ManageDropProviderAndProps,
  ManageDropProviderAndState
> {
  public readonly state = {
    isDraggingOver: false,
    itemsAnd: [],
  };

  public render() {
    return this.props.children({
      isDraggingOver: this.state.isDraggingOver,
      itemsAnd: this.state.itemsAnd,
      setIsDraggingOver: this.setIsDraggingOver,
      setItemAnd: this.setItemAnd,
      deleteItemAnd: this.deleteItemAnd,
    });
  }

  private setIsDraggingOver = (isDraggingOver: boolean) => {
    if (isDraggingOver !== this.state.isDraggingOver) {
      this.setState({ ...this.state, isDraggingOver });
    }
  };

  private setItemAnd = (dataProvider: DataProvider, width: number) => {
    const itemsAnd = this.state.itemsAnd;
    const alreadyExistsAtIndex = itemsAnd.findIndex(
      (p: ItemAnd) => p.dataProvider.id === dataProvider.id
    );

    const newItemsAnd: ItemAnd[] =
      alreadyExistsAtIndex > -1
        ? [
            ...itemsAnd.slice(0, alreadyExistsAtIndex),
            { dataProvider, width },
            ...itemsAnd.slice(alreadyExistsAtIndex + 1),
          ]
        : [...itemsAnd, { dataProvider, width }];

    this.setState({ ...this.state, itemsAnd: newItemsAnd });
  };

  private deleteItemAnd = (providerId: string) => {
    const itemsAnd = this.state.itemsAnd;
    const indexToRemove = itemsAnd.findIndex((p: ItemAnd) => p.dataProvider.id === providerId);
    const newItemsAnd: ItemAnd[] = [
      ...itemsAnd.slice(0, indexToRemove),
      ...itemsAnd.slice(indexToRemove + 1),
    ];
    this.setState({ ...this.state, itemsAnd: newItemsAnd });
  };
}
