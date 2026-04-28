/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { Transaction as ITransaction } from '../../../../../typings/es_schemas/ui/transaction';
import type { IWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import type { TraceItem } from '../../../../../common/waterfall/unified_trace_item';
import { getTraceParentChildrenMap } from '../../../shared/trace_waterfall/use_trace_waterfall';
import {
  EBT_CLICK_ACTION_VIEW_FULL_TRACE,
  EBT_ELEMENT_WATERFALL_VIEW_FULL_TRACE,
} from '../../../shared/trace_waterfall/ebt_constants';

function FullTraceButton({
  isLoading,
  isDisabled,
  onClick,
}: {
  isLoading?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <EuiButtonEmpty
      aria-label={i18n.translate('xpack.apm.fullTraceButton.viewFullTraceButton.ariaLabel', {
        defaultMessage: 'View full trace',
      })}
      data-test-subj="apmFullTraceButtonViewFullTraceButton"
      data-ebt-action={onClick ? EBT_CLICK_ACTION_VIEW_FULL_TRACE : undefined}
      data-ebt-element={onClick ? EBT_ELEMENT_WATERFALL_VIEW_FULL_TRACE : undefined}
      iconType="chartWaterfall"
      isLoading={isLoading}
      disabled={isDisabled}
      onClick={onClick}
    >
      {i18n.translate('xpack.apm.transactionDetails.viewFullTraceButtonLabel', {
        defaultMessage: 'View full trace',
      })}
    </EuiButtonEmpty>
  );
}

export function MaybeViewTraceLink({
  isLoading,
  transaction,
  waterfall,
  useUnified = false,
  traceItems = [],
  onViewFullTrace,
}: {
  isLoading: boolean;
  transaction?: ITransaction;
  waterfall: IWaterfall;
  useUnified?: boolean;
  traceItems?: TraceItem[];
  onViewFullTrace: () => void;
}) {
  const rootTransactionInfo = useMemo(() => {
    if (!useUnified) {
      const root = waterfall.rootWaterfallTransaction;
      if (!root) return undefined;
      return {
        id: root.id,
        name: root.doc.transaction.name,
        serviceName: root.doc.service.name,
        traceId: root.doc.trace.id,
        transactionType: root.doc.transaction.type,
        serviceEnvironment: root.doc.service.environment,
      };
    }
    const traceMap = getTraceParentChildrenMap(traceItems, false);
    const root = traceMap.root?.[0];
    if (!root || root.docType !== 'transaction') return undefined;
    return {
      id: root.id,
      name: root.name,
      serviceName: root.serviceName,
      traceId: root.traceId,
      transactionType: root.type,
      serviceEnvironment: root.serviceEnvironment,
    };
  }, [useUnified, waterfall.rootWaterfallTransaction, traceItems]);

  if (isLoading || !transaction) {
    return <FullTraceButton isLoading={isLoading} />;
  }

  // the traceroot cannot be found, so we cannot link to it
  if (!rootTransactionInfo) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.apm.transactionDetails.noTraceParentButtonTooltip', {
          defaultMessage: 'The trace parent cannot be found',
        })}
      >
        <FullTraceButton isDisabled />
      </EuiToolTip>
    );
  }

  const isRoot = transaction.transaction.id === rootTransactionInfo.id;

  // the user is already viewing the full trace, so disable the button
  if (isRoot) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.apm.transactionDetails.viewingFullTraceButtonTooltip', {
          defaultMessage: 'Currently viewing the full trace',
        })}
      >
        <FullTraceButton isDisabled />
      </EuiToolTip>
    );
  }

  // the user is viewing a partial trace — open the full trace flyout
  return <FullTraceButton onClick={onViewFullTrace} />;
}
