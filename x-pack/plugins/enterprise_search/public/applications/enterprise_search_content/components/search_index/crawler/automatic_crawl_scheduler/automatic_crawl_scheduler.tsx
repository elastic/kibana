/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import {
  HOURS_UNIT_LABEL,
  DAYS_UNIT_LABEL,
  WEEKS_UNIT_LABEL,
  MONTHS_UNIT_LABEL,
  SAVE_BUTTON_LABEL,
} from '../../../../../shared/constants';
import { DataPanel } from '../../../../../shared/data_panel/data_panel';

import { docLinks } from '../../../../../shared/doc_links/doc_links';
import { CrawlUnits } from '../../../../api/crawler/types';

import { AutomaticCrawlSchedulerLogic } from './automatic_crawl_scheduler_logic';

export const AutomaticCrawlScheduler: React.FC = () => {
  const { setCrawlFrequency, setCrawlUnit, saveChanges, toggleCrawlAutomatically } = useActions(
    AutomaticCrawlSchedulerLogic
  );

  const { crawlAutomatically, crawlFrequency, crawlUnit, isSubmitting } = useValues(
    AutomaticCrawlSchedulerLogic
  );

  const formId = htmlIdGenerator('AutomaticCrawlScheduler')();

  return (
    <>
      <EuiSpacer />
      <DataPanel
        hasBorder
        title={
          <h2>
            {i18n.translate('xpack.enterpriseSearch.automaticCrawlSchedule.title', {
              defaultMessage: 'Automated Crawl Scheduling',
            })}
          </h2>
        }
        titleSize="s"
        subtitle={
          <FormattedMessage
            id="xpack.enterpriseSearch.crawler.automaticCrawlSchedule.formDescription"
            defaultMessage="Setup automated crawling. {readMoreMessage}."
            values={{
              readMoreMessage: (
                <EuiLink href={docLinks.crawlerManaging} target="_blank" external>
                  {i18n.translate(
                    'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.readMoreLink',
                    {
                      defaultMessage: 'Read more.',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        }
        iconType="calendar"
      >
        <EuiForm
          onSubmit={(event) => {
            event.preventDefault();
            saveChanges();
          }}
          component="form"
          id={formId}
        >
          <EuiFormRow display="rowCompressed">
            <EuiSwitch
              data-telemetry-id="entSearchContent-crawler-scheduleCrawl-crawlAutomatically"
              autoFocus
              checked={crawlAutomatically}
              label={
                <EuiText>
                  {i18n.translate(
                    'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.crawlAutomaticallySwitchLabel',
                    {
                      defaultMessage: 'Crawl automatically',
                    }
                  )}
                </EuiText>
              }
              onChange={toggleCrawlAutomatically}
              compressed
            />
          </EuiFormRow>
          <EuiFormRow display="rowCompressed">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText>
                  {i18n.translate(
                    'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.crawlUnitsPrefix',
                    {
                      defaultMessage: 'Every',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFieldNumber
                  data-telemetry-id="entSearchContent-crawler-scheduleCrawl-crawlAutomatically-scheduleFrequency"
                  aria-label={i18n.translate(
                    'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.scheduleFrequencyLabel',
                    {
                      defaultMessage: 'Schedule frequency',
                    }
                  )}
                  disabled={!crawlAutomatically}
                  fullWidth={false}
                  min={0}
                  max={99}
                  compressed
                  value={crawlFrequency}
                  onChange={(e) => setCrawlFrequency(parseInt(e.target.value, 10))}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  data-telemetry-id="entSearchContent-crawler-scheduleCrawl-crawlAutomatically-scheduleUnits"
                  aria-label={i18n.translate(
                    'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.scheduleUnitsLabel',
                    {
                      defaultMessage: 'Schedule units of time',
                    }
                  )}
                  disabled={!crawlAutomatically}
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
              <EuiFlexItem />
            </EuiFlexGroup>
          </EuiFormRow>
          <EuiSpacer />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.automaticCrawlSchedule.scheduleDescription',
              {
                defaultMessage:
                  'The crawl schedule will perform a full crawl on every domain on this index.',
              }
            )}
          </EuiText>
          <EuiSpacer />
          <EuiFormRow display="rowCompressed">
            <EuiButton
              data-telemetry-id="entSearchContent-crawler-scheduleCrawl-crawlAutomatically-save"
              form={formId}
              type="submit"
              isLoading={isSubmitting}
              fill
            >
              {SAVE_BUTTON_LABEL}
            </EuiButton>
          </EuiFormRow>
        </EuiForm>
      </DataPanel>
    </>
  );
};
