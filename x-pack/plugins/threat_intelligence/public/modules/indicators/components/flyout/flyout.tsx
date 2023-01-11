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
import { IndicatorsFlyoutContext } from './context';
import { TakeAction } from './take_action/take_action';
import { DateFormatter } from '../../../../components/date_formatter/date_formatter';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { IndicatorsFlyoutJson } from './json_tab';
import { IndicatorsFlyoutTable } from './table_tab';
import { unwrapValue } from '../../utils';
import { IndicatorsFlyoutOverview } from './overview_tab';
import {
  INDICATORS_FLYOUT_TABS_TEST_ID,
  INDICATORS_FLYOUT_TITLE_TEST_ID,
  INDICATORS_FLYOUT_SUBTITLE_TEST_ID,
} from './test_ids';
enum TAB_IDS {
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
  /**
   * Boolean deciding if we show or hide the filter in/out feature in the flyout.
   * We should be showing the filter in and out buttons when the flyout is used in the cases view.
   */
  kqlBarIntegration?: boolean;
  /**
   * Name of the indicator, used only when the flyout is rendered in the Cases view.
   * Because the indicator name is a runtime field, when querying for the indicator from within
   * the Cases view, this logic is not ran. Therefore, passing the name to the flyout is an
   * easy (hopefully temporary) solution to display it within the flyout.
   */
  indicatorName?: string;
}

/**
 * Leverages the {@link EuiFlyout} from the @elastic/eui library to dhow the details of a specific {@link Indicator}.
 */
export const IndicatorsFlyout: VFC<IndicatorsFlyoutProps> = ({
  indicator,
  closeFlyout,
  kqlBarIntegration = false,
  indicatorName,
}) => {
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
          <h2 data-test-subj={INDICATORS_FLYOUT_TITLE_TEST_ID} id={flyoutTitleId}>
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.flyout.panelTitleWithOverviewTab"
              defaultMessage="Indicator details"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size={'xs'}>
          <p data-test-subj={INDICATORS_FLYOUT_SUBTITLE_TEST_ID}>
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.flyout.panelSubTitle"
              defaultMessage="First seen: "
            />
            <DateFormatter date={firstSeen} />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs data-test-subj={INDICATORS_FLYOUT_TABS_TEST_ID} style={{ marginBottom: '-25px' }}>
          {renderTabs}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <IndicatorsFlyoutContext.Provider value={{ kqlBarIntegration, indicatorName }}>
          {selectedTabContent}
        </IndicatorsFlyoutContext.Provider>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <TakeAction indicator={indicator} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
