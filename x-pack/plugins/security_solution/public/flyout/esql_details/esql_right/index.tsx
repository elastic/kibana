/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { EuiCallOut, EuiCode, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { convertDataTableRecordToTimelineItem } from '../utils';
import type { ESQLDetailsPanelProps } from '../types';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { FlyoutTableTab } from '../../shared/components/flyout_table_tab';
import { FlyoutJsonTab } from '../../shared/components/flyout_json_tab';
import { getColumnsProvider } from './get_columns_provider';

const ESQLDetailsCallout = (
  <EuiCallOut
    size="m"
    iconType="iInCircle"
    style={{ padding: '6px' }}
    title={
      <FormattedMessage
        id="xpack.securitySolution.flyout.basic.right.header.esqlMetadataCallout.title"
        defaultMessage="Access full document"
      />
    }
  >
    <FormattedMessage
      id="xpack.securitySolution.flyout.basic.right.header.esqlMetadataCallout.body"
      defaultMessage="To access the full document flyout, please add {metadataBlock} to the {fromBlock} clause in your query and if you currently have a {keepBlock} clause, please add {keepFields} there as well"
      values={{
        metadataBlock: <EuiCode>{'METADATA _id, _index'}</EuiCode>,
        fromBlock: <EuiCode>{'FROM'}</EuiCode>,
        keepBlock: <EuiCode>{'KEEP'}</EuiCode>,
        keepFields: <EuiCode>{'_id, _index'}</EuiCode>,
      }}
    />
  </EuiCallOut>
);

export const ESQLDetailsPanel = (props: ESQLDetailsPanelProps) => {
  const {
    params: { data, scopeId },
  } = props;
  const timelineData = convertDataTableRecordToTimelineItem(data);
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;
  const sourcererDataView = useSourcererDataView(sourcererScope);
  const columnsProvider = getColumnsProvider(scopeId);

  const tabs = useMemo(
    () => [
      {
        id: 'table',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.basic.right.header.tableTab"
            defaultMessage="Table"
          />
        ),
        content: (
          <FlyoutTableTab
            browserFields={sourcererDataView.browserFields}
            dataFormattedForFieldBrowser={timelineData}
            eventId={data.id}
            scopeId={scopeId}
            getColumns={columnsProvider}
          />
        ),
      },
      {
        id: 'json',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.basic.right.header.jsonTab"
            defaultMessage="JSON"
          />
        ),
        content: <FlyoutJsonTab searchHit={data.raw} />,
      },
    ],
    [columnsProvider, data.id, data.raw, scopeId, sourcererDataView.browserFields, timelineData]
  );

  const [selectedTabId, setSelectedTabId] = useState('table');

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  return (
    <>
      <FlyoutHeader hasBorder>
        <EuiSpacer size="m" />
        <EuiTabs style={{ marginBottom: '-16px' }} bottomBorder={false}>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              onClick={() => setSelectedTabId(tab.id)}
              isSelected={tab.id === selectedTabId}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </FlyoutHeader>
      <FlyoutBody banner={ESQLDetailsCallout}>{selectedTabContent}</FlyoutBody>
    </>
  );
};
