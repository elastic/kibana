/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EntityDefinitionWithState, EntityDefintionResponse } from '@kbn/entities-schema';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { Badges } from '../../../../components/badges';
import { useKibana } from '../../../../hooks/use_kibana';
import { paths } from '../../../../../common/locators/paths';
import { LastSeenStat } from '../../../../components/stats/last_seen';
import { EntityCountStat } from '../../../../components/stats/entity_count';
import { useFetchEntityDefinitions } from '../../../../hooks/use_fetch_entity_definitions';

interface ListingProps {
  definition: EntityDefinitionWithState;
}

function Listing({ definition }: ListingProps) {
  const {
    http: { basePath },
    entityClient,
  } = useKibana().services;
  const [isPopoverOpen, setPopover] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const entityDetailUrl = basePath.prepend(paths.entitieDetail(definition.id));
  const { refetch: refetchDefinitions } = useFetchEntityDefinitions();

  const checkpointDuration = definition.resources.transforms.reduce(
    (acc, transformState) => {
      if (transformState.stats.stats.exponential_avg_checkpoint_duration_ms > acc.duration) {
        return {
          duration: transformState.stats.stats.exponential_avg_checkpoint_duration_ms,
          id: transformState.id,
        };
      }
      return acc;
    },
    { duration: 0, id: '' }
  );

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText>
                <p>
                  <a href={entityDetailUrl}>{definition.name}</a>
                </p>
              </EuiText>
            </EuiFlexItem>
            <Badges definition={definition} />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <LastSeenStat definition={definition} titleSize="s" textAlign="right" />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EntityCountStat definition={definition} titleSize="s" textAlign="right" />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiStat
            titleSize="s"
            title={`${numeral(checkpointDuration.duration).format('0,0') + 'ms' || 'N/A'}`}
            textAlign="right"
            description={i18n.translate(
              'xpack.entityManager.listing.historyCheckpointDuration.label',
              {
                defaultMessage: 'Checkpoint Duration',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiPopover
            id={`${definition.id}-context-menu-popover`}
            button={
              <EuiButtonIcon
                data-test-subj="entityManagerListingButton"
                iconType="boxesVertical"
                color="text"
                onClick={() => setPopover(!isPopoverOpen)}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={() => setPopover(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel
              size="s"
              items={[
                <EuiContextMenuItem
                  key="delete"
                  icon="trash"
                  color="danger"
                  disabled={isDeleting}
                  onClick={async () => {
                    try {
                      setIsDeleting(true);

                      await entityClient.repositoryClient(
                        'DELETE /internal/entities/definition/{id}',
                        {
                          params: {
                            path: { id: definition.id },
                            query: { deleteData: true },
                          },
                        }
                      );

                      refetchDefinitions();
                    } finally {
                      setIsDeleting(false);
                      setPopover(false);
                    }
                  }}
                >
                  Delete
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

interface Props {
  definitions?: EntityDefintionResponse['definitions'];
  isLoading?: boolean;
}

export function DefinitionListing() {
  const { data } = useFetchEntityDefinitions();
  if (!data) return null;

  const definitions = data?.map((definition) => {
    return <Listing definition={definition} key={definition.id} />;
  });

  return <EuiFlexGroup direction="column">{definitions}</EuiFlexGroup>;
}
