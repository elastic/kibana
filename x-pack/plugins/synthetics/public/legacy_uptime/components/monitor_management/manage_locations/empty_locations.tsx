/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButton, EuiTitle, EuiLink } from '@elastic/eui';

export const EmptyLocations = ({ setIsAddingNew }: { setIsAddingNew: (val: boolean) => void }) => {
  return (
    <EuiEmptyPrompt
      iconType="visMapCoordinate"
      title={<h2>Start adding private locations</h2>}
      body={<p>Add your first private location to run monitors on premiss via Elastic agent.</p>}
      actions={
        <EuiButton color="primary" fill onClick={() => setIsAddingNew(true)}>
          Add location
        </EuiButton>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>Want to learn more?</h3>
          </EuiTitle>
          <EuiLink href="#" target="_blank">
            Read the docs
          </EuiLink>
        </>
      }
    />
  );
};
