/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiAccordion,
  EuiPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ProcessEvent } from '../../../common/types/process_tree';
import { useStyles } from './styles';
import { DetailPanelAlertActions } from '../detail_panel_alert_actions';

export const ALERT_LIST_ITEM_TEST_ID = 'sessionView:detailPanelAlertListItem';
export const ALERT_LIST_ITEM_ARGS_TEST_ID = 'sessionView:detailPanelAlertListItemArgs';
export const ALERT_LIST_ITEM_TIMESTAMP_TEST_ID = 'sessionView:detailPanelAlertListItemTimestamp';

interface DetailPanelAlertsListItemDeps {
  event: ProcessEvent;
  onShowAlertDetails: (alertId: string) => void;
  onJumpToEvent: (event: ProcessEvent) => void;
  isInvestigated?: boolean;
  minimal?: boolean;
}

/**
 * Detail panel description list item.
 */
export const DetailPanelAlertListItem = ({
  event,
  onJumpToEvent,
  onShowAlertDetails,
  isInvestigated,
  minimal,
}: DetailPanelAlertsListItemDeps) => {
  const styles = useStyles(minimal, isInvestigated);

  if (!event.kibana) {
    return null;
  }

  const timestamp = event['@timestamp'];
  const { uuid, name } = event.kibana.alert.rule;
  const { args } = event.process;

  const forceState = !isInvestigated ? 'open' : undefined;

  return minimal ? (
    <div data-test-subj={ALERT_LIST_ITEM_TEST_ID}>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {timestamp}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DetailPanelAlertActions
            css={styles.minimalContextMenu}
            event={event}
            onJumpToEvent={onJumpToEvent}
            onShowAlertDetails={onShowAlertDetails}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPanel
        css={styles.processPanel}
        color="subdued"
        hasBorder
        hasShadow={false}
        borderRadius="m"
      >
        <EuiText size="xs">{args.join(' ')}</EuiText>
      </EuiPanel>
      <EuiHorizontalRule css={styles.minimalHR} margin="m" size="full" />
    </div>
  ) : (
    <EuiAccordion
      id={uuid}
      data-test-subj={ALERT_LIST_ITEM_TEST_ID}
      arrowDisplay={isInvestigated ? 'right' : 'none'}
      buttonContent={
        <EuiText css={styles.alertTitle} size="s">
          <p>
            <EuiIcon color="danger" type="alert" css={styles.alertIcon} />
            {name}
          </p>
        </EuiText>
      }
      initialIsOpen={true}
      forceState={forceState}
      css={styles.alertItem}
      extraAction={
        <DetailPanelAlertActions
          event={event}
          onJumpToEvent={onJumpToEvent}
          onShowAlertDetails={onShowAlertDetails}
        />
      }
    >
      <EuiSpacer size="xs" />
      <EuiText data-test-subj={ALERT_LIST_ITEM_TIMESTAMP_TEST_ID} color="subdued" size="s">
        {timestamp}
      </EuiText>
      <EuiPanel
        css={styles.processPanel}
        color="subdued"
        hasBorder
        hasShadow={false}
        borderRadius="m"
      >
        <EuiText data-test-subj={ALERT_LIST_ITEM_ARGS_TEST_ID} size="xs">
          {args.join(' ')}
        </EuiText>
      </EuiPanel>
      {isInvestigated && (
        <div css={styles.investigatedLabel}>
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.sessionView.detailPanelAlertListItem.investigatedLabel"
              defaultMessage="Investigated alert"
            />
          </EuiText>
        </div>
      )}
    </EuiAccordion>
  );
};
