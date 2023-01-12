/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPopover,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { ALERT_RISK_SCORE, ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { SeverityBadge } from '../../../../detections/components/rules/severity_badge';
import { useEventDetailsPanelContext } from './context';
import { useBasicDataFromDetailsData } from '../../helpers';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import * as i18n from './translations';
import { EventVisualizePanelKey } from '../visualize';
import { useExpandableFlyoutContext } from '../../../context';
import type { EventPanelPaths } from '../../../../common/store/flyout/model';
import { eventTabs } from './tabs';

const HeaderTopRow = ({ handleOnEventClosed }: { handleOnEventClosed?: () => void }) => {
  const [isPopoverOpen, updateIsPopoverOpen] = useState(false);
  const { updateFlyoutPanels, closeFlyout } = useExpandableFlyoutContext();
  const { searchHit } = useEventDetailsPanelContext();
  const { _id, _index } = searchHit ?? {};
  const closePopover = () => updateIsPopoverOpen(false);
  const openPopover = () => updateIsPopoverOpen(true);

  const close = () => {
    if (handleOnEventClosed) handleOnEventClosed();
    closeFlyout();
  };

  const panels = [
    {
      id: 0,
      title: 'Alert details',
      items: [
        {
          name: 'Visualize',
          onClick: () =>
            updateFlyoutPanels({
              left:
                _id && _index
                  ? {
                      panelKind: EventVisualizePanelKey,
                      params: { eventId: _id, indexName: _index },
                    }
                  : undefined,
            }),
        },
      ],
    },
  ];

  const button = useMemo(
    () => (
      <EuiButtonEmpty color="text" iconType="arrowStart" onClick={openPopover}>
        {i18n.EXPAND_DETAILS}
      </EuiButtonEmpty>
    ),
    []
  );

  return (
    <>
      <div>
        <EuiPopover
          anchorPosition="downCenter"
          button={button}
          closePopover={closePopover}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </div>
      <div>
        {handleOnEventClosed && (
          <EuiButtonIcon iconType="cross" aria-label={i18n.CLOSE} onClick={close} />
        )}
      </div>
    </>
  );
};

const HeaderTitleSection = () => {
  const { dataFormattedForFieldBrowser, getFieldsData } = useEventDetailsPanelContext();
  const { isAlert, ruleName, timestamp } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );
  const alertRiskScore = getFieldsData(ALERT_RISK_SCORE) as string;
  const alertSeverity = getFieldsData(ALERT_SEVERITY) as Severity;

  return (
    <>
      <EuiTitle size="s">
        <h4>{isAlert && !isEmpty(ruleName) ? ruleName : i18n.EVENT_DETAILS}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="xs">
            <EuiTitle size="xxs">
              <h5>{`${i18n.SEVERITY_TITLE}:`}</h5>
            </EuiTitle>
            <SeverityBadge value={alertSeverity} />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="xs">
            <EuiTitle size="xxs">
              <h5>{`${i18n.RISK_SCORE_TITLE}:`}</h5>
            </EuiTitle>
            <span>{alertRiskScore}</span>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const EventHeader = React.memo(
  ({
    selectedTabId,
    setSelectedTabId,
    handleOnEventClosed,
  }: {
    selectedTabId: EventPanelPaths;
    setSelectedTabId: (selected: EventPanelPaths) => void;
    handleOnEventClosed?: () => void;
  }) => {
    const onSelectedTabChanged = (id: EventPanelPaths) => setSelectedTabId(id);

    const renderTabs = eventTabs.map((tab, index) => (
      <EuiTab
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));

    const { euiTheme } = useEuiTheme();
    return (
      <EuiFlyoutHeader
        css={css`
          margin-bottom: -24px;
          padding: 0;
          padding-inline: 0 !important;
          padding-block-start: 0 !important;
        `}
      >
        <EuiFlexGroup
          css={css`
            flex: 0 1 auto;
            justify-content: flex-start;
            margin-bottom: ${euiTheme.size.l};
          `}
          direction="column"
          gutterSize="none"
          justifyContent="spaceBetween"
          wrap={true}
        >
          <EuiFlexItem>
            <EuiFlexGroup
              css={css`
                border-bottom: ${euiTheme.border.thin};
                gap: 0 !important;
                margin-bottom: ${euiTheme.size.m};
              `}
              direction="row"
              alignItems="center"
            >
              <HeaderTopRow handleOnEventClosed={handleOnEventClosed} />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              padding: 0 ${euiTheme.size.m};
            `}
          >
            <HeaderTitleSection />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        <EuiTabs size="l" expand>
          {renderTabs}
        </EuiTabs>
      </EuiFlyoutHeader>
    );
  }
);

EventHeader.displayName = 'EventHeader';
