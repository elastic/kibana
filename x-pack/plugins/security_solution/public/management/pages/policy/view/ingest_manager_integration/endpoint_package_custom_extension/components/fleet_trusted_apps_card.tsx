/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { GetExceptionSummaryResponse } from '../../../../../../../../common/endpoint/types';

import { useKibana, useToasts } from '../../../../../../../common/lib/kibana';
import { ExceptionItemsSummary } from './exception_items_summary';
import { TrustedAppsHttpService } from '../../../../../trusted_apps/service';
import { StyledEuiFlexGridGroup, StyledEuiFlexGridItem } from './styled_components';

interface FleetTrustedAppsCardProps {
  customLink: React.ReactNode;
  policyId?: string;
  cardSize?: 'm' | 'l';
}

export const FleetTrustedAppsCard = memo<FleetTrustedAppsCardProps>(
  ({ customLink, policyId, cardSize = 'l' }) => {
    const {
      services: { http },
    } = useKibana();
    const toasts = useToasts();
    const [stats, setStats] = useState<GetExceptionSummaryResponse | undefined>();
    const trustedAppsApi = useMemo(() => new TrustedAppsHttpService(http), [http]);
    const isMounted = useRef<boolean>();

    useEffect(() => {
      isMounted.current = true;
      const fetchStats = async () => {
        try {
          const response = await trustedAppsApi.getTrustedAppsSummary({
            kuery: policyId
              ? `exception-list-agnostic.attributes.tags:"policy:${policyId}" OR exception-list-agnostic.attributes.tags:"policy:all"`
              : undefined,
          });
          if (isMounted) {
            setStats(response);
          }
        } catch (error) {
          if (isMounted.current) {
            toasts.addDanger(
              i18n.translate(
                'xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppsSummaryError',
                {
                  defaultMessage:
                    'There was an error trying to fetch trusted apps stats: "{error}"',
                  values: { error },
                }
              )
            );
          }
        }
      };
      fetchStats();
      return () => {
        isMounted.current = false;
      };
    }, [toasts, trustedAppsApi, policyId]);

    const getTitleMessage = () => (
      <FormattedMessage
        id="xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppsLabel"
        defaultMessage="Trusted Applications"
      />
    );

    return (
      <EuiPanel hasShadow={false} paddingSize="l" hasBorder data-test-subj="fleetTrustedAppsCard">
        <StyledEuiFlexGridGroup alignItems="baseline" justifyContent="center" cardSize={cardSize}>
          <StyledEuiFlexGridItem gridarea="title" alignitems="flex-start">
            <EuiText>
              {cardSize === 'l' ? <h4>{getTitleMessage()}</h4> : <h5>{getTitleMessage()}</h5>}
            </EuiText>
          </StyledEuiFlexGridItem>
          <StyledEuiFlexGridItem gridarea="summary">
            <ExceptionItemsSummary stats={stats} isSmall={cardSize === 'm'} />
          </StyledEuiFlexGridItem>
          <StyledEuiFlexGridItem gridarea="link" alignitems="flex-end">
            {customLink}
          </StyledEuiFlexGridItem>
        </StyledEuiFlexGridGroup>
      </EuiPanel>
    );
  }
);

FleetTrustedAppsCard.displayName = 'FleetTrustedAppsCard';
