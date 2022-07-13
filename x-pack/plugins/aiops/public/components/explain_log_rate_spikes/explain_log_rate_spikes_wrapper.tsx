/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useState } from 'react';
import { parse, stringify } from 'query-string';
import { isEqual } from 'lodash';
import { encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import type { WindowParameters } from '@kbn/aiops-utils';
import type { DataView } from '@kbn/data-views-plugin/public';

import {
  Accessor,
  Dictionary,
  parseUrlState,
  Provider as UrlStateContextProvider,
  isRisonSerializationRequired,
  getNestedProperty,
  SetUrlState,
} from '../../hooks/url_state';
import { useData } from '../../hooks/use_data';
import { useUrlState } from '../../hooks/url_state';

import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DocumentCountContent } from '../document_count_content/document_count_content';
import { DatePickerWrapper } from '../date_picker_wrapper';

import { ExplainLogRateSpikes } from './explain_log_rate_spikes';

export interface ExplainLogRateSpikesWrapperProps {
  /** The data view to analyze. */
  dataView: DataView;
}

export const ExplainLogRateSpikesWrapper: FC<ExplainLogRateSpikesWrapperProps> = ({ dataView }) => {
  const [globalState, setGlobalState] = useUrlState('_g');

  const { docStats, timefilter } = useData(dataView, setGlobalState);
  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();

  const activeBounds = timefilter.getActiveBounds();
  let earliest: number | undefined;
  let latest: number | undefined;
  if (activeBounds !== undefined) {
    earliest = activeBounds.min?.valueOf();
    latest = activeBounds.max?.valueOf();
  }

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.time), timefilter]);

  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.refreshInterval), timefilter]);

  const history = useHistory();
  const { search: urlSearchString } = useLocation();

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = urlSearchString;
      const urlState = parseUrlState(prevSearchString);
      const parsedQueryString = parse(prevSearchString, { sort: false });

      if (!Object.prototype.hasOwnProperty.call(urlState, accessor)) {
        urlState[accessor] = {};
      }

      if (typeof attribute === 'string') {
        if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
          return prevSearchString;
        }

        urlState[accessor][attribute] = value;
      } else {
        const attributes = attribute;
        Object.keys(attributes).forEach((a) => {
          urlState[accessor][a] = attributes[a];
        });
      }

      try {
        const oldLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        Object.keys(urlState).forEach((a) => {
          if (isRisonSerializationRequired(a)) {
            parsedQueryString[a] = encode(urlState[a]);
          } else {
            parsedQueryString[a] = urlState[a];
          }
        });
        const newLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        if (oldLocationSearchString !== newLocationSearchString) {
          const newSearchString = stringify(parsedQueryString, { sort: false });
          if (replaceState) {
            history.replace({ search: newSearchString });
          } else {
            history.push({ search: newSearchString });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Could not save url state', error);
      }
    },
    [history, urlSearchString]
  );

  if (!dataView || !timefilter) return null;

  return (
    <UrlStateContextProvider value={{ searchString: urlSearchString, setUrlState }}>
      <EuiPageBody data-test-subj="aiOpsIndexPage" paddingSize="none" panelled={false}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiPageContentHeader className="aiOpsPageHeader">
              <EuiPageContentHeaderSection>
                <div className="aiOpsTitleHeader">
                  <EuiTitle size={'s'}>
                    <h2>{dataView.title}</h2>
                  </EuiTitle>
                </div>
              </EuiPageContentHeaderSection>

              <EuiFlexGroup
                alignItems="center"
                justifyContent="flexEnd"
                gutterSize="s"
                data-test-subj="aiOpsTimeRangeSelectorSection"
              >
                {dataView.timeFieldName !== undefined && (
                  <EuiFlexItem grow={false}>
                    <FullTimeRangeSelector
                      dataView={dataView}
                      query={undefined}
                      disabled={false}
                      timefilter={timefilter}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <DatePickerWrapper />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeader>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule />
        <EuiPageContentBody>
          {docStats?.totalCount !== undefined && (
            <DocumentCountContent
              brushSelectionUpdateHandler={setWindowParameters}
              documentCountStats={docStats.documentCountStats}
              totalCount={docStats.totalCount}
            />
          )}
          <EuiSpacer size="m" />
          {earliest !== undefined && latest !== undefined && windowParameters !== undefined && (
            <ExplainLogRateSpikes
              dataView={dataView}
              earliest={earliest}
              latest={latest}
              windowParameters={windowParameters}
            />
          )}
        </EuiPageContentBody>
      </EuiPageBody>
    </UrlStateContextProvider>
  );
};
