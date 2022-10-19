/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, VFC } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { InvestigateInTimelineButton } from '../../../timeline';
import { DateFormatter } from '../../../../components/date_formatter/date_formatter';
import { Indicator, RawIndicatorFieldId } from '../../types';
import { IndicatorsFlyoutJson } from './json_tab';
import { IndicatorsFlyoutTable } from './table_tab';
import { unwrapValue } from '../../utils';
import { IndicatorsFlyoutOverview } from './overview_tab';

export const TITLE_TEST_ID = 'tiIndicatorFlyoutTitle';
export const SUBTITLE_TEST_ID = 'tiIndicatorFlyoutSubtitle';
export const TABS_TEST_ID = 'tiIndicatorFlyoutTabs';
export const INVESTIGATE_IN_TIMELINE_BUTTON_ID = 'tiIndicatorFlyoutInvestigateInTimelineButton';

const enum TAB_IDS {
  overview,
  table,
  json,
}

export interface IndicatorsFlyoutProps {
  /**
   * Indicator passed down to the different tabs (table and json views).
   */
  indicator: Indicator;
  /**
   * Event to close flyout (used by {@link EuiFlyout}).
   */
  closeFlyout: () => void;
}

/**
 * Leverages the {@link EuiFlyout} from the @elastic/eui library to dhow the details of a specific {@link Indicator}.
 */
export const IndicatorsFlyout: VFC<IndicatorsFlyoutProps> = ({ indicator, closeFlyout }) => {
  const [selectedTabId, setSelectedTabId] = useState(TAB_IDS.overview);

  const tabs = useMemo(
    () => [
      {
        id: TAB_IDS.overview,
        name: (
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.flyout.overviewTabLabel"
            defaultMessage="Overview"
          />
        ),
        content: (
          <IndicatorsFlyoutOverview
            indicator={indicator}
            onViewAllFieldsInTable={() => setSelectedTabId(TAB_IDS.table)}
          />
        ),
      },
      {
        id: TAB_IDS.table,
        name: (
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.flyout.tableTabLabel"
            defaultMessage="Table"
          />
        ),
        content: <IndicatorsFlyoutTable indicator={indicator} />,
      },
      {
        id: TAB_IDS.json,
        name: (
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.flyout.jsonTabLabel"
            defaultMessage="JSON"
          />
        ),
        content: <IndicatorsFlyoutJson indicator={indicator} />,
      },
    ],
    [indicator]
  );
  const onSelectedTabChanged = (id: number) => setSelectedTabId(id);

  const renderTabs = tabs.map((tab, index) => (
    <EuiTab
      onClick={() => onSelectedTabChanged(tab.id)}
      isSelected={tab.id === selectedTabId}
      key={index}
    >
      {tab.name}
    </EuiTab>
  ));

  const selectedTabContent = useMemo(
    () => tabs.find((obj) => obj.id === selectedTabId)?.content,
    [selectedTabId, tabs]
  );

  const firstSeen: string = unwrapValue(indicator, RawIndicatorFieldId.FirstSeen) as string;

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 data-test-subj={TITLE_TEST_ID} id={flyoutTitleId}>
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.flyout.panelTitleWithOverviewTab"
              defaultMessage="Indicator details"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size={'xs'}>
          <p data-test-subj={SUBTITLE_TEST_ID}>
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.flyout.panelSubTitle"
              defaultMessage="First seen: "
            />
            <DateFormatter date={firstSeen} />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs data-test-subj={TABS_TEST_ID} style={{ marginBottom: '-25px' }}>
          {renderTabs}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{selectedTabContent}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <InvestigateInTimelineButton
              data={indicator}
              data-test-subj={INVESTIGATE_IN_TIMELINE_BUTTON_ID}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
