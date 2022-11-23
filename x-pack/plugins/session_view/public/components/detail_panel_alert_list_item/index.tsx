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
  formatDate,
  EuiToolTip,
} from '@elastic/eui';
import { getAlertIconTooltipContent } from '../../../common/utils/alert_icon_tooltip_content';
import { ALERT_ICONS } from '../../../common/constants';
import { ProcessEvent, ProcessEventAlertCategory } from '../../../common/types/process_tree';
import { useStyles } from './styles';
import { DetailPanelAlertActions } from '../detail_panel_alert_actions';
import { dataOrDash } from '../../utils/data_or_dash';
import { useDateFormat } from '../../hooks';
import { getAlertCategoryDisplayText } from '../../utils/alert_category_display_text';
export const ALERT_LIST_ITEM_TEST_ID = 'sessionView:detailPanelAlertListItem';
export const ALERT_LIST_ITEM_ARGS_TEST_ID = 'sessionView:detailPanelAlertListItemArgs';
export const ALERT_LIST_ITEM_FILE_PATH_TEST_ID = 'sessionView:detailPanelAlertListItemFilePath';
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
  const dateFormat = useDateFormat();

  if (!event.kibana) {
    return null;
  }

  const timestamp = formatDate(event['@timestamp'], dateFormat);
  const rule = event.kibana?.alert?.rule;
  const uuid = rule?.uuid || '';
  const name = rule?.name || '';

  const { args, name: processName } = event.process ?? {};
  const { event: processEvent } = event;
  const forceState = !isInvestigated ? 'open' : undefined;
  const category = processEvent?.category?.[0];
  const processEventAlertCategory = category ?? ProcessEventAlertCategory.process;
  const alertCategoryDetailDisplayText =
    category !== ProcessEventAlertCategory.process
      ? `${dataOrDash(processName)} ${getAlertCategoryDisplayText(event, category)}`
      : dataOrDash(args?.join(' '));
  const alertIconTooltipContent = getAlertIconTooltipContent(processEventAlertCategory);

  return minimal ? (
    <div data-test-subj={ALERT_LIST_ITEM_TEST_ID} css={styles.firstAlertPad}>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {dataOrDash(timestamp)}
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
        <EuiText data-test-subj={ALERT_LIST_ITEM_ARGS_TEST_ID} size="xs">
          {alertCategoryDetailDisplayText}
        </EuiText>
      </EuiPanel>
      <EuiHorizontalRule css={styles.minimalHR} margin="m" size="full" />
    </div>
  ) : (
    <EuiAccordion
      id={uuid}
      data-test-subj={ALERT_LIST_ITEM_TEST_ID}
      arrowDisplay={isInvestigated ? 'right' : 'none'}
      buttonContent={
        <EuiText css={styles.alertTitleContainer} size="s">
          <p css={styles.alertTitle}>
            <EuiToolTip position="top" content={alertIconTooltipContent}>
              <EuiIcon
                color="danger"
                type={ALERT_ICONS[processEventAlertCategory]}
                css={styles.alertIcon}
              />
            </EuiToolTip>

            {dataOrDash(name)}
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
        {dataOrDash(timestamp)}
      </EuiText>
      <EuiPanel
        css={styles.processPanel}
        color="subdued"
        hasBorder
        hasShadow={false}
        borderRadius="m"
      >
        <EuiText data-test-subj={ALERT_LIST_ITEM_ARGS_TEST_ID} size="xs">
          {alertCategoryDetailDisplayText}
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
