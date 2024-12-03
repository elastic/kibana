/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo, useCallback } from 'react';
import { EuiContextMenuItem, type EuiIconProps } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { DocumentDetailsRightPanelKey } from '../../document_details/shared/constants/panel_keys';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useBasicDataFromDetailsData } from '../../document_details/shared/hooks/use_basic_data_from_details_data';
import { useEventDetails } from '../../document_details/shared/hooks/use_event_details';
import { getField, getAlertTitle, getEventTitle } from '../../document_details/shared/utils';
import { RulePanelKey } from '../../rule_details/right';
import { UserPanelKey } from '../../entity_details/user_right';
import { HostPanelKey } from '../../entity_details/host_right';
import { NetworkPanelKey } from '../../network_details';
import { useRuleDetails } from '../../rule_details/hooks/use_rule_details';
import {
  DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID,
  RULE_HISTORY_ROW_TEST_ID,
  GENERIC_HISTORY_ROW_TEST_ID,
} from './test_ids';

export interface FlyoutHistoryRowProps {
  /**
   * Flyout item to display
   */
  item: FlyoutPanelProps;
  /**
   * Index of the flyout in the list
   */
  index: number;
}

/**
 * Row item for a flyout history row
 */
export const FlyoutHistoryRow: FC<FlyoutHistoryRowProps> = memo(({ item, index }) => {
  switch (item.id) {
    case DocumentDetailsRightPanelKey:
      return <DocumentDetailsHistoryRow item={item} index={index} />;
    case RulePanelKey:
      return <RuleHistoryRow item={item} index={index} />;
    case HostPanelKey:
      return (
        <GenericHistoryRow
          item={item}
          index={index}
          title={String(item?.params?.hostName)}
          icon={'storage'}
          name={'Host'}
        />
      );
    case UserPanelKey:
      return (
        <GenericHistoryRow
          item={item}
          index={index}
          title={String(item?.params?.userName)}
          icon={'user'}
          name={'User'}
        />
      );
    case NetworkPanelKey:
      return (
        <GenericHistoryRow
          item={item}
          index={index}
          title={String(item?.params?.ip)}
          icon={'globe'}
          name={'Network'}
        />
      );
  }
  return null;
});

/**
 * Row item for a document details
 */
export const DocumentDetailsHistoryRow: FC<FlyoutHistoryRowProps> = memo(({ item, index }) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const { dataFormattedForFieldBrowser, getFieldsData } = useEventDetails({
    eventId: String(item?.params?.id),
    indexName: String(item?.params?.indexName),
  });
  const { ruleId, isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { rule: maybeRule } = useRuleWithFallback(ruleId);
  const eventKind = getField(getFieldsData('event.kind'));
  const eventCategory = getField(getFieldsData('event.category'));

  const title = useMemo(
    () =>
      isAlert
        ? getAlertTitle({ ruleName: maybeRule?.name })
        : getEventTitle({ eventKind, eventCategory, getFieldsData }),
    [isAlert, maybeRule, eventKind, eventCategory, getFieldsData]
  );

  const onClick = useCallback(() => {
    openFlyout({ right: item });
  }, [openFlyout, item]);

  return (
    <EuiContextMenuItem
      icon={isAlert ? 'warning' : 'analyzeEvent'}
      key={index}
      onClick={onClick}
      data-test-subj={`${index}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`}
    >
      {isAlert ? <i>{'Alert: '}</i> : <i>{'Event: '}</i>}
      {title}
    </EuiContextMenuItem>
  );
});

/**
 * Row item for a rule details flyout
 */
export const RuleHistoryRow: FC<FlyoutHistoryRowProps> = memo(({ item, index }) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const ruleId = String(item?.params?.ruleId);
  const { rule } = useRuleDetails({ ruleId });

  const onClick = useCallback(() => {
    openFlyout({ right: item });
  }, [openFlyout, item]);

  return (
    <EuiContextMenuItem
      key={index}
      onClick={onClick}
      icon={'indexSettings'}
      data-test-subj={`${index}-${RULE_HISTORY_ROW_TEST_ID}`}
    >
      <i>{'Rule: '}</i>
      {rule?.name}
    </EuiContextMenuItem>
  );
});

interface GenericHistoryRowProps extends FlyoutHistoryRowProps {
  /**
   * Icon to display
   */
  icon: EuiIconProps['type'];
  /**
   * Title to display
   */
  title: string;
  /**
   * Name to display
   */
  name: string;
}

/**
 * Row item for a generic history row where the title is accessible in flyout params
 */
export const GenericHistoryRow: FC<GenericHistoryRowProps> = memo(
  ({ item, index, title, icon, name }) => {
    const { openFlyout } = useExpandableFlyoutApi();
    const onClick = useCallback(() => {
      openFlyout({ right: item });
    }, [openFlyout, item]);

    return (
      <EuiContextMenuItem
        key={index}
        onClick={onClick}
        icon={icon}
        data-test-subj={`${index}-${GENERIC_HISTORY_ROW_TEST_ID}`}
      >
        <i>{`${name}: `}</i>
        {title}
      </EuiContextMenuItem>
    );
  }
);

FlyoutHistoryRow.displayName = 'FlyoutHistoryRow';
DocumentDetailsHistoryRow.displayName = 'DocumentDetailsHistoryRow';
RuleHistoryRow.displayName = 'RuleHistoryRow';
GenericHistoryRow.displayName = 'GenericHistoryRow';
