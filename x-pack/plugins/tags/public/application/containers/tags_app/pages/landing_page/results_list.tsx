/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { useTagsApp } from '../../../../context';

export interface Props {
  tagIds: string[];
}

export const ResultsList: React.FC<Props> = ({ tagIds }) => {
  const { tags } = useTagsApp();
  const isMounted = useMountedState();
  useEffect(() => {
    tags
      .attachments!.findResources({
        tagIds,
        kidPrefix: 'kid:',
        page: 1,
        perPage: 100,
      })
      .then(
        (response) => {
          if (!isMounted()) return;
        },
        (error) => {
          if (!isMounted()) return;
        }
      );
  }, [isMounted, tags.attachments, tagIds]);

  return (
    <div>
      {tagIds.map((id) => (
        <div key={id}>{id}</div>
      ))}
    </div>
  );
};
