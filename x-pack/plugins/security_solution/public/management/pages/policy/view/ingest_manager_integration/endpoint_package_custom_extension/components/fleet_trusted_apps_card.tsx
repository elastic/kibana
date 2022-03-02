/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { GetExceptionSummaryResponse } from '../../../../../../../../common/endpoint/types';

import { useKibana, useToasts } from '../../../../../../../common/lib/kibana';
import { ExceptionItemsSummary } from './exception_items_summary';
import { parsePoliciesToKQL } from '../../../../../../common/utils';
import { TrustedAppsHttpService } from '../../../../../trusted_apps/service';
import {
  StyledEuiFlexGridGroup,
  StyledEuiFlexGridItem,
  StyledEuiFlexItem,
} from './styled_components';

export interface FleetTrustedAppsCardProps {
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
          const response = await trustedAppsApi.getTrustedAppsSummary(
            policyId ? parsePoliciesToKQL([policyId, 'all']) : undefined
          );
          if (isMounted.current) {
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
      if (!stats) {
        fetchStats();
      }
      return () => {
        isMounted.current = false;
      };
    }, [toasts, trustedAppsApi, policyId, stats]);

    const getTitleMessage = () => (
      <FormattedMessage
        id="xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppsLabel"
        defaultMessage="Trusted applications"
      />
    );

    const cardGrid = useMemo(() => {
      if (cardSize === 'm') {
        return (
          <EuiFlexGroup
            alignItems="baseline"
            justifyContent="flexStart"
            gutterSize="s"
            direction="row"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiText>
                <h5>{getTitleMessage()}</h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ExceptionItemsSummary stats={stats} isSmall={true} />
            </EuiFlexItem>
            <StyledEuiFlexItem grow={1}>{customLink}</StyledEuiFlexItem>
          </EuiFlexGroup>
        );
      } else {
        return (
          <StyledEuiFlexGridGroup alignItems="baseline" justifyContent="center">
            <StyledEuiFlexGridItem gridarea="title" alignitems="flex-start">
              <EuiText>
                <h4>{getTitleMessage()}</h4>
              </EuiText>
            </StyledEuiFlexGridItem>
            <StyledEuiFlexGridItem gridarea="summary" alignitems={'center'}>
              <ExceptionItemsSummary stats={stats} isSmall={false} />
            </StyledEuiFlexGridItem>
            <StyledEuiFlexGridItem gridarea="link" alignitems="flex-end">
              {customLink}
            </StyledEuiFlexGridItem>
          </StyledEuiFlexGridGroup>
        );
      }
    }, [cardSize, customLink, stats]);

    return (
      <EuiPanel hasShadow={false} paddingSize="l" hasBorder data-test-subj="fleetTrustedAppsCard">
        {cardGrid}
      </EuiPanel>
    );
  }
);

FleetTrustedAppsCard.displayName = 'FleetTrustedAppsCard';
