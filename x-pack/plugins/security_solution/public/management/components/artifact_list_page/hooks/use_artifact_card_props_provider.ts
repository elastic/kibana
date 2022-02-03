/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useCallback, useMemo } from 'react';
import { AnyArtifact, ArtifactEntryCardProps } from '../../artifact_entry_card';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

export interface UseArtifactCardPropsProviderProps {
  artifacts: ExceptionListItemSchema[];
  policies: ArtifactEntryCardProps['policies'];
  cardActionEditLabel: string;
  cardActionDeleteLabel: string;
  dataTestSubj?: string;
}

export type ArtifactCardPropsProvider = (
  artifactItem: ExceptionListItemSchema
) => ArtifactEntryCardProps;

/**
 * Return a function that can be used to retrieve props for an `ArtifactCardEntry` component given an
 * `ExceptionListItemSchema` on input
 */
export const useArtifactCardPropsProvider = ({
  artifacts,
  policies,
  cardActionDeleteLabel,
  cardActionEditLabel,
  dataTestSubj,
}: UseArtifactCardPropsProviderProps): ArtifactCardPropsProvider => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  const artifactCardPropsPerItem = useMemo(() => {
    const cachedCardProps: Record<string, ArtifactEntryCardProps> = {};

    // Casting `listItems` below to remove the `Immutable<>` from it in order to prevent errors
    // with common component's props
    for (const artifactItem of artifacts as ExceptionListItemSchema[]) {
      cachedCardProps[artifactItem.id] = {
        item: artifactItem as AnyArtifact,
        policies,
        'data-test-subj': dataTestSubj,
        actions: [
          {
            icon: 'controlsHorizontal',
            onClick: () => {
              // FIXME:PT implement url update
              // history.push(
              //   getEventFiltersListPath({
              //     ...location,
              //     show: 'edit',
              //     id: eventFilter.id,
              //   })
              // );
            },
            'data-test-subj': getTestId('cardEditAction'),
            children: cardActionEditLabel,
          },
          {
            icon: 'trash',
            onClick: () => {
              // FIXME:PT implement
            },
            'data-test-subj': getTestId('cardDeleteAction'),
            children: cardActionDeleteLabel,
          },
        ],
        hideDescription: !artifactItem.description,
        hideComments: !artifactItem.comments.length,
      };
    }

    return cachedCardProps;
  }, [artifacts, cardActionDeleteLabel, cardActionEditLabel, dataTestSubj, getTestId, policies]);

  return useCallback(
    (artifactItem: ExceptionListItemSchema) => {
      return artifactCardPropsPerItem[artifactItem.id];
    },
    [artifactCardPropsPerItem]
  );
};
