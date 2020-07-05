/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { useTagsApp } from '../../../../context';

export interface Props {
  tagIds: string[];
}

export const ResultsList: React.FC<Props> = ({ tagIds }) => {
  const { tags, kid } = useTagsApp();
  const isMounted = useMountedState();
  const [kids, setKids] = useState<string[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
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
          setKids(response.attachments.map((item) => item.kid));
        },
        (newError) => {
          if (!isMounted()) return;
          setError(newError);
        }
      );
  }, [isMounted, tags.attachments, tagIds]);

  if (error || !kids) return null;

  return (
    <div>
      {kids.map((resuldKid) => (
        <kid.Card kid={resuldKid} />
      ))}
    </div>
  );
};
