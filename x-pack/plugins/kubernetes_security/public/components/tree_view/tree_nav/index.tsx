/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButtonGroup, EuiPanel, useGeneratedHtmlId } from '@elastic/eui';

export const TreeNav = () => {
  const treeNavTypePrefix = useGeneratedHtmlId({
    prefix: 'treeNavType',
  });

  const [toggleIdSelected, setToggleIdSelected] = useState(`${treeNavTypePrefix}__0`);

  const options = [
    {
      id: `${treeNavTypePrefix}__0`,
      label: 'Logical view',
    },
    {
      id: `${treeNavTypePrefix}__1`,
      label: 'Infrastructure view',
    },
  ];

  return (
    <>
      <EuiPanel hasBorder>
        <EuiButtonGroup
          name="coarsness"
          legend="This is a basic group"
          options={options}
          idSelected={toggleIdSelected}
          onChange={(id) => setToggleIdSelected(id)}
          buttonSize="compressed"
          isFullWidth
          color="primary"
        />
      </EuiPanel>
    </>
  );
};
