/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiListGroup,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { createEsParams, useEsSearch, useFetcher } from '../../../../../../observability/public';
import { selectDynamicSettings } from '../../../../state/selectors';
import { useUptimeSettingsContext } from '../../../../contexts/uptime_settings_context';
import { formatDuration } from '../../../monitor/ping_list/ping_list';
import { MonitorSavedObject } from '../../../../../common/types';
import { apiService } from '../../../../state/api/utils';
import { API_URLS } from '../../../../../common/constants';

interface Props {
  monitorId: string;
  monitor: MonitorSavedObject;
}
export const TestRunResult = ({ monitorId, monitor }: Props) => {
  const { settings } = useSelector(selectDynamicSettings);

  const { basePath } = useUptimeSettingsContext();

  const [refresh, setRefresh] = useState(Date.now());
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [summaryDoc, setSummaryDoc] = useState(null);
  const [stepEnds, setStepEnds] = useState([]);

  useEffect(() => {
    let tickTick;
    if (!summaryDoc) {
      tickTick = setInterval(() => {
        setRefresh(Date.now());
      }, 5 * 1000);
    } else {
      if (tickTick) clearInterval(tickTick);
    }

    return () => {
      if (tickTick) clearInterval(tickTick);
    };
  }, [summaryDoc]);

  // useFetcher(() => {
  //   if (monitor?.id) {
  //     return apiService.post(API_URLS.GET_IN_PROGRESS_JOBS, {
  //       monitor: { ...monitor.attributes, id: monitor.id },
  //     });
  //   }
  // }, [monitor, refresh]);

  const { data } = useEsSearch(
    createEsParams({
      index: settings?.heartbeatIndices,
      body: {
        sort: [
          {
            '@timestamp': 'desc',
          },
        ],
        query: {
          bool: {
            filter: [
              {
                term: {
                  'monitor.id': monitorId,
                },
              },
              {
                terms: {
                  'synthetics.type': ['heartbeat/summary', 'journey/start', 'step/end'],
                },
              },
            ],
          },
        },
      },
      size: 10,
    }),
    [monitorId, settings?.heartbeatIndices, refresh],
    {}
  );

  useEffect(() => {
    const hits = data?.hits.hits;

    const stepEndsT = [];
    if (hits && hits.length > 0) {
      hits?.forEach((hit) => {
        const dc = hit._source;
        if (dc.synthetics.type === 'journey/start') {
          setJourneyStarted(true);
        }
        if (dc.synthetics.type === 'heartbeat/summary') {
          setSummaryDoc(dc);
        }
        if (dc.synthetics.type === 'step/end') {
          stepEndsT.push(dc);
        }
      });
    }
    setStepEnds(stepEndsT);
  }, [data]);

  const myContent = stepEnds
    .sort((stepA, stepB) => stepA.synthetics.step.index - stepB.synthetics.step.index)
    .map((stepDoc) => ({
      label: (
        <>
          <span>{stepDoc.synthetics.step.name}</span>
          <EuiText className="eui-displayInline" color="subdued" size="s">
            {formatDuration(stepDoc.synthetics.step.duration.us)}
          </EuiText>
        </>
      ),
      href: `${basePath}/app/uptime/journey/${stepDoc.monitor.check_group}/steps`,
      icon: (
        <span style={{ width: 90 }}>
          <EuiBadge color={stepDoc.synthetics.step.status === 'failed' ? 'danger' : 'success'}>
            {stepDoc.synthetics.step.status}
          </EuiBadge>
        </span>
      ),
      size: 's',
      extraAction: {
        color: 'text',
        onClick: () => {
          window.open(
            `${basePath}/app/uptime/journey/${stepDoc.monitor.check_group}/step/${stepDoc.synthetics.step.index}`
          );
        },
        iconType: 'visArea',
        iconSize: 's',
        'aria-label': 'Favorite link2',
        alwaysShow: true,
        title: 'View performance breakdown',
      },
    }));

  const hits = data?.hits.hits;

  const doc = hits?.[0]?._source;

  return (
    <EuiPanel>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>Test Run</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          {summaryDoc ? (
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary">COMPLETED</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  Took {formatDuration(summaryDoc.monitor.duration.us)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem style={{ width: 100 }}>
                <EuiBadge color={journeyStarted ? 'primary' : 'warning'}>
                  {journeyStarted ? 'IN PROGRESS' : 'PENDING'}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLoadingSpinner />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
        {doc && (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={`${basePath}/app/uptime/journey/${doc.monitor.check_group}/steps`}
              target="_blank"
            >
              View test result details
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiListGroup listItems={myContent} maxWidth={false} />
      <EuiHorizontalRule margin="xs" />
    </EuiPanel>
  );
};
