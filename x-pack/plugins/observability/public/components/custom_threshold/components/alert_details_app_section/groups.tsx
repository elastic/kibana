/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export function Groups({ groups }: { groups: Array<{ field: string; value: string }> }) {
  return (
    <>
      {groups &&
        groups.map((group) => {
          return (
            <span key={group.field}>
              {group.field}: <strong>{group.value}</strong>
              <br />
            </span>
          );
        })}
    </>
  );
}
