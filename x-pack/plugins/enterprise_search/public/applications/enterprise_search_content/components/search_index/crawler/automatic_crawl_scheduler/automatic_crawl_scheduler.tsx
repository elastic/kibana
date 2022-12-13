/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCheckableCard,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSplitPanel,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  HOURS_UNIT_LABEL,
  DAYS_UNIT_LABEL,
  WEEKS_UNIT_LABEL,
  MONTHS_UNIT_LABEL,
} from '../../../../../shared/constants';
import { EnterpriseSearchCronEditor } from '../../../../../shared/cron_editor/enterprise_search_cron_editor';
import { docLinks } from '../../../../../shared/doc_links/doc_links';
import { CrawlUnits } from '../../../../api/crawler/types';
import { isCrawlerIndex } from '../../../../utils/indices';

import { AutomaticCrawlSchedulerLogic } from './automatic_crawl_scheduler_logic';

export const AutomaticCrawlScheduler: React.FC = () => {
  const {
    setCrawlAutomatically,
    setCrawlFrequency,
    setCrawlUnit,
    setUseConnectorSchedule,
    submitConnectorSchedule,
  } = useActions(AutomaticCrawlSchedulerLogic);

  const { index, crawlAutomatically, crawlFrequency, crawlUnit, useConnectorSchedule } = useValues(
    AutomaticCrawlSchedulerLogic
  );

  if (!isCrawlerIndex(index)) {
    return <></>;
  }

  return (
    <>
      <EuiSpacer />
      <EuiTitle size="m">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.automaticCrawlSchedule.title', {
            defaultMessage: 'Crawl frequency',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiSplitPanel.Outer grow>
        <EuiSplitPanel.Inner grow={false} color="subdued">
          <EuiFormRow display="rowCompressed">
            <EuiSwitch
              data-telemetry-id="entSearchContent-crawler-scheduleCrawl-crawlAutomatically"
              autoFocus
              checked={crawlAutomatically}
              label={i18n.translate(
                'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.crawlAutomaticallySwitchLabel',
                {
                  defaultMessage: 'Enable recurring crawls with the following schedule',
                }
              )}
              onChange={(e) => setCrawlAutomatically(e.target.checked)}
              compressed
            />
          </EuiFormRow>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCheckableCard
                id="specificTimeSchedulingCard"
                label={
                  <>
                    <EuiTitle size="xxs">
                      <h5>
                        {i18n.translate(
                          'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.cronSchedulingTitle',
                          {
                            defaultMessage: 'Specific time scheduling',
                          }
                        )}
                      </h5>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="subdued">
                      {i18n.translate(
                        'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.cronSchedulingDescription',
                        {
                          defaultMessage: 'Define the frequency and time for scheduled crawls',
                        }
                      )}
                    </EuiText>
                    <EuiHorizontalRule margin="s" />
                  </>
                }
                checked={crawlAutomatically && useConnectorSchedule}
                disabled={!crawlAutomatically}
                onChange={() => setUseConnectorSchedule(true)}
              >
                <EnterpriseSearchCronEditor
                  disabled={!crawlAutomatically || !useConnectorSchedule}
                  scheduling={index.connector.scheduling}
                  onChange={(newScheduling) =>
                    submitConnectorSchedule({
                      ...newScheduling,
                      enabled: true,
                    })
                  }
                />
              </EuiCheckableCard>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCheckableCard
                id="intervalSchedulingCard"
                label={
                  <>
                    <EuiTitle size="xxs">
                      <h5>
                        {i18n.translate(
                          'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.intervalSchedulingTitle',
                          {
                            defaultMessage: 'Interval scheduling',
                          }
                        )}
                      </h5>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="subdued">
                      {i18n.translate(
                        'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.intervalSchedulingDescription',
                        {
                          defaultMessage: 'Define the frequency for scheduled crawls',
                        }
                      )}
                    </EuiText>
                    <EuiHorizontalRule margin="s" />
                  </>
                }
                checked={crawlAutomatically && !useConnectorSchedule}
                disabled={!crawlAutomatically}
                onChange={() => setUseConnectorSchedule(false)}
              >
                <EuiFormRow display="rowCompressed" label="Frequency" fullWidth>
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiFieldNumber
                        data-telemetry-id="entSearchContent-crawler-scheduleCrawl-crawlAutomatically-scheduleFrequency"
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.scheduleFrequencyLabel',
                          {
                            defaultMessage: 'Schedule frequency',
                          }
                        )}
                        disabled={!crawlAutomatically || useConnectorSchedule}
                        min={0}
                        max={99}
                        compressed
                        value={crawlFrequency}
                        onChange={(e) => setCrawlFrequency(parseInt(e.target.value, 10))}
                        prepend={'Every'}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiSelect
                        data-telemetry-id="entSearchContent-crawler-scheduleCrawl-crawlAutomatically-scheduleUnits"
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.scheduleUnitsLabel',
                          {
                            defaultMessage: 'Schedule units of time',
                          }
                        )}
                        disabled={!crawlAutomatically || useConnectorSchedule}
                        fullWidth
                        compressed
                        options={[
                          {
                            text: HOURS_UNIT_LABEL,
                            value: CrawlUnits.hours,
                          },
                          {
                            text: DAYS_UNIT_LABEL,
                            value: CrawlUnits.days,
                          },
                          {
                            text: WEEKS_UNIT_LABEL,
                            value: CrawlUnits.weeks,
                          },
                          {
                            text: MONTHS_UNIT_LABEL,
                            value: CrawlUnits.months,
                          },
                        ]}
                        value={crawlUnit}
                        onChange={(e) => setCrawlUnit(e.target.value as CrawlUnits)}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
              </EuiCheckableCard>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.scheduleDescription',
              {
                defaultMessage:
                  'The crawl schedule will perform a full crawl on every domain on this index.',
              }
            )}
            <EuiSpacer size="s" />
            <EuiLink href={docLinks.crawlerManaging} target="_blank" external>
              {i18n.translate(
                'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.readMoreLink',
                {
                  defaultMessage: 'Learn more about scheduling',
                }
              )}
            </EuiLink>
          </EuiText>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
