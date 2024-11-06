/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiPopoverFooter,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CANCEL_BUTTON_LABEL, SAVE_BUTTON_LABEL } from '../../../../../shared/constants';
import {
  DAYS_UNIT_LABEL,
  HOURS_UNIT_LABEL,
  MONTHS_UNIT_LABEL,
  WEEKS_UNIT_LABEL,
} from '../../../../../shared/constants/units';

import { WEB_CRAWLER_DOCS_URL } from '../../../../routes';
import { CrawlUnits } from '../../types';

import { AutomaticCrawlSchedulerLogic } from './automatic_crawl_scheduler_logic';

import { ManageCrawlsPopoverLogic } from './manage_crawls_popover_logic';

export const AutomaticCrawlScheduler: React.FC = () => {
  const {
    fetchCrawlSchedule,
    setCrawlFrequency,
    setCrawlUnit,
    saveChanges,
    toggleCrawlAutomatically,
  } = useActions(AutomaticCrawlSchedulerLogic);

  const { closePopover } = useActions(ManageCrawlsPopoverLogic);

  const { crawlAutomatically, crawlFrequency, crawlUnit, isSubmitting } = useValues(
    AutomaticCrawlSchedulerLogic
  );

  useEffect(() => {
    fetchCrawlSchedule();
  }, []);

  const formId = htmlIdGenerator('AutomaticCrawlScheduler')();

  return (
    <EuiForm
      onSubmit={(event) => {
        event.preventDefault();
        saveChanges();
      }}
      component="form"
      id={formId}
    >
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.enterpriseSearch.appSearch.crawler.automaticCrawlSchedule.formDescription"
          defaultMessage="Don't worry about it, we'll start a crawl for you. {readMoreMessage}."
          values={{
            readMoreMessage: (
              <EuiLink href={WEB_CRAWLER_DOCS_URL} target="_blank">
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.automaticCrawlSchedule.readMoreLink',
                  {
                    defaultMessage: 'Read more.',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow display="rowCompressed">
        <EuiSwitch
          autoFocus
          checked={crawlAutomatically}
          label={
            <EuiText>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.automaticCrawlSchedule.crawlAutomaticallySwitchLabel',
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
                'xpack.enterpriseSearch.appSearch.crawler.automaticCrawlSchedule.crawlUnitsPrefix',
                {
                  defaultMessage: 'Every',
                }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFieldNumber
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.automaticCrawlSchedule.scheduleFrequencyLabel',
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
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.automaticCrawlSchedule.scheduleUnitsLabel',
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
          'xpack.enterpriseSearch.appSearch.crawler.automaticCrawlSchedule.scheduleDescription',
          {
            defaultMessage: 'The crawl schedule applies to every domain on this engine.',
          }
        )}
      </EuiText>
      <EuiPopoverFooter>
        <EuiFormRow display="rowCompressed">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButtonEmpty onClick={closePopover}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton form={formId} type="submit" isLoading={isSubmitting} fill>
                {SAVE_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiPopoverFooter>
    </EuiForm>
  );
};
