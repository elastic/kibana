/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiDescriptionList,
  EuiDescriptionListProps,
  EuiTitle,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import moment from 'moment';

import { USES_HEADLESS_JOB_TYPES } from '../../../common/constants';
import { VisualReportingSoftDisabledError } from '../../../common/errors';

import type { Job } from '../../lib/job';
import { useKibana } from '../../shared_imports';

import { i18nTexts } from './i18n_texts';

const NA = i18n.translate('xpack.reporting.listing.infoPanel.notApplicableLabel', {
  defaultMessage: 'N/A',
});

const UNKNOWN = i18n.translate('xpack.reporting.listing.infoPanel.unknownLabel', {
  defaultMessage: 'unknown',
});

interface Props {
  info: Job;
}

const createDateFormatter = (format: string, tz: string) => (date: string) => {
  const m = moment.tz(date, tz);
  return m.isValid() ? m.format(format) : NA;
};

export const ReportInfoFlyoutContent: FunctionComponent<Props> = ({ info }) => {
  const {
    services: { uiSettings },
  } = useKibana();

  const timezone =
    uiSettings.get('dateFormat:tz') === 'Browser'
      ? moment.tz.guess()
      : uiSettings.get('dateFormat:tz');

  const formatDate = createDateFormatter(uiSettings.get('dateFormat'), timezone);

  const cpuInPercentage = info.metrics?.pdf?.cpuInPercentage ?? info.metrics?.png?.cpuInPercentage;
  const memoryInMegabytes =
    info.metrics?.pdf?.memoryInMegabytes ?? info.metrics?.png?.memoryInMegabytes;
  const hasCsvRows = info.metrics?.csv?.rows != null;
  const hasScreenshot = USES_HEADLESS_JOB_TYPES.includes(info.jobtype);
  const hasPdfPagesMetric = info.metrics?.pdf?.pages != null;

  const outputInfo = [
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.statusInfo', {
        defaultMessage: 'Status',
      }),
      description: info.prettyStatus,
    },
    Boolean(info.version) && {
      title: i18n.translate('xpack.reporting.listing.infoPanel.kibanaVersion', {
        defaultMessage: 'Kibana version',
      }),
      description: info.version,
    },
    Boolean(info.spaceId) && {
      title: i18n.translate('xpack.reporting.listing.infoPanel.space', {
        defaultMessage: 'Kibana space',
      }),
      description: info.spaceId,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.attemptsInfo', {
        defaultMessage: 'Attempts',
      }),
      description: info.max_attempts
        ? i18n.translate('xpack.reporting.listing.infoPanel.attempts', {
            defaultMessage: '{attempts} of {maxAttempts}',
            values: { attempts: info.attempts, maxAttempts: info.max_attempts },
          })
        : info.attempts,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.contentTypeInfo', {
        defaultMessage: 'Content type',
      }),
      description: info.content_type || NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.sizeInfo', {
        defaultMessage: 'Size in bytes',
      }),
      description: info.size?.toString() || NA,
    },
    hasCsvRows && {
      title: i18n.translate('xpack.reporting.listing.infoPanel.csvRows', {
        defaultMessage: 'CSV rows',
      }),
      description: info.metrics?.csv?.rows?.toString() || NA,
    },

    hasScreenshot && {
      title: i18n.translate('xpack.reporting.listing.infoPanel.dimensionsInfoHeight', {
        defaultMessage: 'Height in pixels',
      }),
      description:
        info.layout?.dimensions?.height != null
          ? Math.ceil(info.layout.dimensions.height)
          : UNKNOWN,
    },
    hasScreenshot && {
      title: i18n.translate('xpack.reporting.listing.infoPanel.dimensionsInfoWidth', {
        defaultMessage: 'Width in pixels',
      }),
      description:
        info.layout?.dimensions?.width != null ? Math.ceil(info.layout.dimensions.width) : UNKNOWN,
    },
    hasPdfPagesMetric && {
      title: i18n.translate('xpack.reporting.listing.infoPanel.pdfPagesInfo', {
        defaultMessage: 'Pages count',
      }),
      description: info.metrics?.pdf?.pages,
    },

    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.processedByInfo', {
        defaultMessage: 'Processed by',
      }),
      description:
        info.kibana_name && info.kibana_id ? `${info.kibana_name} (${info.kibana_id})` : NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.timeoutInfo', {
        defaultMessage: 'Timeout',
      }),
      description: info.prettyTimeout,
    },

    cpuInPercentage != null && {
      title: i18n.translate('xpack.reporting.listing.infoPanel.cpuInfo', {
        defaultMessage: 'CPU usage',
      }),
      description: `${cpuInPercentage}%`,
    },

    memoryInMegabytes != null && {
      title: i18n.translate('xpack.reporting.listing.infoPanel.memoryInfo', {
        defaultMessage: 'RAM usage',
      }),
      description: `${memoryInMegabytes}MB`,
    },
  ].filter(Boolean) as EuiDescriptionListProps['listItems'];

  const timestampsInfo = [
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.tzInfo', {
        defaultMessage: 'Time zone',
      }),
      description: info.browserTimezone || NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.createdAtInfo', {
        defaultMessage: 'Created at',
      }),
      description: info.created_at ? formatDate(info.created_at) : NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.startedAtInfo', {
        defaultMessage: 'Started at',
      }),
      description: info.started_at ? formatDate(info.started_at) : NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.completedAtInfo', {
        defaultMessage: 'Completed at',
      }),
      description: info.completed_at ? formatDate(info.completed_at) : NA,
    },
  ];

  const warnings = info.getWarnings();
  const errored =
    /*
     * We link the user to documentation if they hit this error case. Note: this
     * should only occur on cloud.
     */
    info.error_code === VisualReportingSoftDisabledError.code
      ? i18nTexts.cloud.insufficientMemoryError('#')
      : info.getError();

  return (
    <>
      {Boolean(errored) && (
        <EuiCallOut
          title={i18n.translate('xpack.reporting.listing.infoPanel.callout.failedReportTitle', {
            defaultMessage: 'Report failed',
          })}
          color="danger"
        >
          {errored}
        </EuiCallOut>
      )}
      {Boolean(warnings) && (
        <>
          {Boolean(errored) && <EuiSpacer size="s" />}
          <EuiCallOut
            title={i18n.translate('xpack.reporting.listing.infoPanel.callout.warningsTitle', {
              defaultMessage: 'Report contains warnings',
            })}
            color="warning"
          >
            {warnings}
          </EuiCallOut>
        </>
      )}
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.reporting.listing.infoPanel.outputSectionTitle', {
            defaultMessage: 'Output',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList listItems={outputInfo} type="column" align="center" compressed />

      <EuiSpacer />
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.reporting.listing.infoPanel.timestampSectionTitle', {
            defaultMessage: 'Timestamps',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList listItems={timestampsInfo} type="column" align="center" compressed />
    </>
  );
};
