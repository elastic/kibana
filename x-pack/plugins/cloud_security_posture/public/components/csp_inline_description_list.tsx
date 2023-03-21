/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, useEuiTheme, type EuiDescriptionListProps } from '@elastic/eui';

const getModifiedTitlesListItems = (listItems: EuiDescriptionListProps['listItems']) =>
  listItems
    ?.filter((item) => !!item?.title && !!item?.description)
    .map((item) => ({ ...item, title: `${item.title}:` }));

// eui size m is 12px which is too small, and next after it is base which is 16px which is too big
const fontSize = '1rem';

export const CspInlineDescriptionList = ({
  listItems,
}: {
  listItems: EuiDescriptionListProps['listItems'];
}) => {
  const { euiTheme } = useEuiTheme();
  const modifiedTitlesListItems = getModifiedTitlesListItems(listItems);

  return (
    <EuiDescriptionList
      type="inline"
      titleProps={{
        style: {
          background: 'initial',
          color: euiTheme.colors.subduedText,
          fontSize,
          paddingRight: 0,
        },
      }}
      descriptionProps={{
        style: {
          color: euiTheme.colors.subduedText,
          marginRight: euiTheme.size.xs,
          fontSize,
        },
      }}
      listItems={modifiedTitlesListItems}
    />
  );
};
