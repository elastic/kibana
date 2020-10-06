/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useContext, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { isEmpty } from 'lodash';
import { EmptySection } from '../../components/app/empty_section';
import { WithHeaderLayout } from '../../components/app/layout/with_header';
import { Resources } from '../../components/app/resources';
import { AlertsSection } from '../../components/app/section/alerts';
import { DatePicker, TimePickerTime } from '../../components/shared/data_picker';
import { NewsFeed } from '../../components/app/news_feed';
import { UI_SETTINGS, useKibanaUISettings } from '../../hooks/use_kibana_ui_settings';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { RouteParams } from '../../routes';
import { getBucketSize } from '../../utils/get_bucket_size';
import { getEmptySections } from './empty_section';
import { LoadingObservability } from './loading_observability';
import { DataSections } from './data_sections';
import { useTrackPageview } from '../..';
import { useHasDataContext } from '../../hooks/use_has_data_context';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

export function calculateBucketSize({ start, end }: { start?: number; end?: number }) {
  if (start && end) {
    return getBucketSize({ start, end, minInterval: '60s' });
  }
}

export function OverviewPage({ routeParams }: Props) {
  useTrackPageview({ app: 'observability', path: 'overview' });
  useTrackPageview({ app: 'observability', path: 'overview', delay: 15000 });
  const { core } = usePluginContext();
  const theme = useContext(ThemeContext);
  const timePickerTime = useKibanaUISettings<TimePickerTime>(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
  const [alertEmptySection, setAlertEmptySection] = useState(false);

  const { hasData } = useHasDataContext();

  if (isEmpty(hasData)) {
    return <LoadingObservability />;
  }

  const { refreshInterval = 10000, refreshPaused = true } = routeParams.query;

  const appEmptySections = getEmptySections({ core }).filter(({ id }) => {
    if (id === 'alert') {
      return alertEmptySection;
    }
    return hasData?.[id] === false;
  });

  return (
    <WithHeaderLayout
      headerColor={theme.eui.euiColorEmptyShade}
      bodyColor={theme.eui.euiPageBackgroundColor}
      showAddData
      showGiveFeedback
    >
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <DatePicker
            rangeFrom={routeParams.query.rangeFrom ?? timePickerTime.from}
            rangeTo={routeParams.query.rangeTo ?? timePickerTime.to}
            refreshInterval={refreshInterval}
            refreshPaused={refreshPaused}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule
        style={{
          width: 'auto', // full width
          margin: '24px -24px', // counteract page paddings
        }}
      />

      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          {/* Data sections */}
          <DataSections hasData={hasData} />

          {/* Empty sections */}
          {!!appEmptySections.length && (
            <EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiFlexGrid
                columns={
                  // when more than 2 empty sections are available show them on 2 columns, otherwise 1
                  appEmptySections.length > 2 ? 2 : 1
                }
                gutterSize="s"
              >
                {appEmptySections.map((app) => {
                  return (
                    <EuiFlexItem
                      key={app.id}
                      style={{
                        border: `1px dashed ${theme.eui.euiBorderColor}`,
                        borderRadius: '4px',
                      }}
                    >
                      <EmptySection section={app} />
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGrid>
            </EuiFlexItem>
          )}
        </EuiFlexItem>

        {/* Alert section */}
        <AlertsSection setAlertEmptySection={setAlertEmptySection} />

        {/* Resources section */}
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <Resources />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <NewsFeed />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WithHeaderLayout>
  );
}
