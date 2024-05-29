/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTERNAL_ASSISTANT_USER_NAME = '_internal_obs_ai_assistant';

export function ownerAccessQuery({
  user,
  namespace,
}: {
  user?: { name: string; id?: string };
  namespace?: string;
}) {
  return {
    should: [
      {
        bool: {
          filter: [
            // Either a normal user or the internal AI Assistant user
            {
              term: {
                'user.name': user?.name,
              },
            },
            // Either a normal space or the * (all) space
            {
              term: {
                namespace,
              },
            },
          ],
        },
      },
      ...(user && user.name === INTERNAL_ASSISTANT_USER_NAME
        ? [
            // For older Knowledge base entries managed by the assistant they lack both user and space information
            {
              bool: {
                must_not: [
                  {
                    exists: {
                      field: 'user',
                    },
                  },
                  {
                    exists: {
                      field: 'namespace',
                    },
                  },
                ],
              },
            },
          ]
        : []),
    ],
    minimum_should_match: 1,
  };
}
