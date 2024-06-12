/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef } from 'react';
import type { InvestigateDetailsAppSectionProps } from '@kbn/observability-plugin/public/rules/create_observability_rule_type_registry';
import { i18n } from '@kbn/i18n';
import type { BurnRateRuleParams } from '../../../../typings';
import { createInvestigateSloDetailWidget } from '../../../../investigate/investigate_slo_detail/create_investigate_slo_detail_widget';
import { useFetchSloDetails } from '../../../../hooks/use_fetch_slo_details';

export function InvestigateDetailsAppSection({
  blocks,
  alert,
  rule,
  onWidgetAdd,
  filters,
  query,
  timeRange,
}: InvestigateDetailsAppSectionProps<BurnRateRuleParams>) {
  const onWidgetAddRef = useRef(onWidgetAdd);

  const sloId = rule.params.sloId;

  const { data: sloData, isLoading } = useFetchSloDetails({
    sloId,
  });

  useEffect(() => {
    return blocks.publish([
      {
        id: 'view_slo',
        loading: isLoading,
        content: i18n.translate('xpack.slo.burnRateInvestigateAppDetails.viewSloWorkfblowBlock', {
          defaultMessage: 'View SLO',
        }),
        onClick: () => {
          if (!sloData) {
            return;
          }
          onWidgetAddRef.current(
            createInvestigateSloDetailWidget({
              title: sloData.name,
              parameters: {
                sloId,
                filters,
                query,
                timeRange,
              },
            })
          );
        },
      },
    ]);
  }, [blocks, filters, query, timeRange, isLoading, sloData, sloId]);
  return <></>;
}
