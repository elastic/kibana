/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo, useState, VFC } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/Indicator';
import { IndicatorsFlyoutJson } from '../indicators_flyout_json/indicators_flyout_json';
import { IndicatorsFlyoutTable } from '../indicators_flyout_table/indicators_flyout_table';
import { unwrapValue } from '../../lib/unwrap_value';
import { displayValue } from '../../lib/display_value';

export const TITLE_TEST_ID = 'tiIndicatorFlyoutTitle';
export const SUBTITLE_TEST_ID = 'tiIndicatorFlyoutSubtitle';

const enum TAB_IDS {
  table,
  json,
}

export const IndicatorsFlyout: VFC<{ indicator: Indicator; closeFlyout: () => void }> = ({
  indicator,
  closeFlyout,
}) => {
  const [selectedTabId, setSelectedTabId] = useState(TAB_IDS.table);

  const tabs = useMemo(
    () => [
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

  const firstSeen = unwrapValue(indicator, RawIndicatorFieldId.FirstSeen);
  const value = displayValue(indicator) || EMPTY_VALUE;

  let formattedFirstSeen: string;
  if (firstSeen) {
    const date = moment(firstSeen);
    formattedFirstSeen = date.isValid() ? date.format('MMMM Do YYYY @ HH:mm:ss') : EMPTY_VALUE;
  } else {
    formattedFirstSeen = EMPTY_VALUE;
  }

  return (
    <EuiFlyout onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 data-test-subj={TITLE_TEST_ID}>
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.flyout.panelTitle"
              defaultMessage="Indicator: {title}"
              values={{ title: value }}
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size={'xs'}>
          <p data-test-subj={SUBTITLE_TEST_ID}>
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.flyout.panelSubTitle"
              defaultMessage="First seen: {subTitle}"
              values={{ subTitle: formattedFirstSeen }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs style={{ marginBottom: '-25px' }}>{renderTabs}</EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{selectedTabContent}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
