/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { csvToArray } from '../../../../common/lib';

type ChildItems = string[] | 'all';

interface Arg {
  items: string[] | string | undefined;
}

export interface ReturnValue {
  items: ChildItems;
  hiddenItemsCount: number;
  isShowingFullList: boolean;
  setIsShowingFullList: (showAll: boolean) => void;
}

const maximumItemPreviewCount = 10;

export const useCollapsibleList = ({ items }: Arg): ReturnValue => {
  const [isShowingFullList, setIsShowingFullList] = useState<boolean>(false);
  const itemsArray = csvToArray(items);
  const displayItems: ChildItems =
    items === undefined
      ? 'all'
      : itemsArray.slice(0, isShowingFullList ? Infinity : maximumItemPreviewCount);

  const hiddenItemsCount =
    itemsArray.length > maximumItemPreviewCount ? itemsArray.length - maximumItemPreviewCount : 0;

  return {
    items: displayItems,
    hiddenItemsCount,
    setIsShowingFullList,
    isShowingFullList,
  };
};
