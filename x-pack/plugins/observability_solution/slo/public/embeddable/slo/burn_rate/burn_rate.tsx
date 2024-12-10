/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingChart,
  UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect, useRef, useState } from 'react';
import { SimpleBurnRate } from '../../../components/slo/simple_burn_rate/burn_rate';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { SloOverviewDetails } from '../common/slo_overview_details';
import { EmbeddableProps } from './types';

export function BurnRate({ sloId, sloInstanceId, duration, reloadSubject }: EmbeddableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);
  const [selectedSlo, setSelectedSlo] = useState<SLOWithSummaryResponse | null>(null);
  const [showAllGroups, setShowAllGroups] = useState(false);

  const { isLoading, data: slo } = useFetchSloDetails({
    sloId,
    instanceId: sloInstanceId,
  });

  useEffect(() => {
    reloadSubject?.subscribe(() => {
      setLastRefreshTime(Date.now());
    });

    return () => {
      reloadSubject?.unsubscribe();
    };
  }, [reloadSubject]);

  const isSloNotFound = !isLoading && slo === undefined;

  if (isLoading || !slo) {
    return (
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center" css={container}>
        <EuiFlexItem grow={false}>
          <EuiLoadingChart />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isSloNotFound) {
    return (
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center" css={container}>
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.slo.sloEmbeddable.overview.sloNotFoundText', {
            defaultMessage:
              'The SLO has been deleted. You can safely delete the widget from the dashboard.',
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const hasGroupings = Object.keys(slo.groupings).length > 0;
  const firstGrouping = hasGroupings ? Object.entries(slo.groupings)[0] : undefined;
  const firstGroupLabel = firstGrouping ? `${firstGrouping[0]}: ${firstGrouping[1]}` : null;
  const hasMoreThanOneGrouping = Object.keys(slo.groupings).length > 1;

  return (
    <div data-shared-item="" ref={containerRef} style={{ width: '100%', padding: 10 }}>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiLink
              data-test-subj="sloBurnRateLink"
              css={link}
              color="text"
              onClick={() => {
                setSelectedSlo(slo);
              }}
            >
              <h2>{slo.name}</h2>
            </EuiLink>
          </EuiFlexItem>
          {hasGroupings && (
            <EuiFlexGroup direction="row" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiBadge>{firstGroupLabel}</EuiBadge>
              </EuiFlexItem>

              {hasMoreThanOneGrouping && !showAllGroups ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    onClick={() => setShowAllGroups(true)}
                    onClickAriaLabel={i18n.translate(
                      'xpack.slo.burnRateEmbeddable.moreInstanceAriaLabel',
                      { defaultMessage: 'Show more' }
                    )}
                  >
                    <FormattedMessage
                      id="xpack.slo.burnRateEmbeddable.moreInstanceLabel"
                      defaultMessage="+{groupingsMore} more instance"
                      values={{ groupingsMore: Object.keys(slo.groupings).length - 1 }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}

              {hasMoreThanOneGrouping && showAllGroups
                ? Object.entries(slo.groupings)
                    .splice(1)
                    .map(([key, value]) => (
                      <EuiFlexItem grow={false}>
                        <EuiBadge>
                          {key}: {value}
                        </EuiBadge>
                      </EuiFlexItem>
                    ))
                : null}
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" justifyContent="flexEnd">
          <SimpleBurnRate slo={slo} duration={duration} lastRefreshTime={lastRefreshTime} />
        </EuiFlexGroup>
      </EuiFlexGroup>

      <SloOverviewDetails slo={selectedSlo} setSelectedSlo={setSelectedSlo} />
    </div>
  );
}

const container = css`
  height: 100%;
`;

const link = ({ euiTheme }: UseEuiTheme) => css`
  font-size: ${euiTheme.size.base};
  font-weight: ${euiTheme.font.weight.bold};
`;
