/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList, EuiSpacer, EuiText } from '@elastic/eui';

import type { Job } from '../../lib/job';
import { USES_HEADLESS_JOB_TYPES } from '../../../common/constants';

const NA = i18n.translate('xpack.reporting.listing.infoPanel.notApplicableLabel', {
  defaultMessage: 'N/A',
});

const UNKNOWN = i18n.translate('xpack.reporting.listing.infoPanel.unknownLabel', {
  defaultMessage: 'unknown',
});

const getDimensions = (info: Job): string => {
  const defaultDimensions = { width: null, height: null };
  const { width, height } = info.layout?.dimensions || defaultDimensions;
  if (width && height) {
    return `Width: ${width} x Height: ${height}`;
  }
  return UNKNOWN;
};

interface Props {
  info: Job;
}

export const ReportInfoFlyoutContent: FunctionComponent<Props> = ({ info }) => {
  const timeout = info.timeout ? info.timeout.toString() : NA;

  const jobInfo = [
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.titleInfo', {
        defaultMessage: 'Title',
      }),
      description: info.title || NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.createdAtInfo', {
        defaultMessage: 'Created at',
      }),
      description: info.getCreatedAtLabel(),
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.statusInfo', {
        defaultMessage: 'Status',
      }),
      description: info.getStatus(),
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.tzInfo', {
        defaultMessage: 'Time zone',
      }),
      description: info.browserTimezone || NA,
    },
  ];

  const processingInfo = [
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.startedAtInfo', {
        defaultMessage: 'Started at',
      }),
      description: info.started_at || NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.completedAtInfo', {
        defaultMessage: 'Completed at',
      }),
      description: info.completed_at || NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.processedByInfo', {
        defaultMessage: 'Processed by',
      }),
      description:
        info.kibana_name && info.kibana_id ? `${info.kibana_name} (${info.kibana_id})` : NA,
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
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.attemptsInfo', {
        defaultMessage: 'Attempts',
      }),
      description: info.attempts.toString(),
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.maxAttemptsInfo', {
        defaultMessage: 'Max attempts',
      }),
      description: info.max_attempts?.toString() || NA,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.timeoutInfo', {
        defaultMessage: 'Timeout',
      }),
      description: timeout,
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.exportTypeInfo', {
        defaultMessage: 'Export type',
      }),
      description: info.isDeprecated
        ? i18n.translate('xpack.reporting.listing.table.reportCalloutExportTypeDeprecated', {
            defaultMessage: '{jobtype} (DEPRECATED)',
            values: { jobtype: info.jobtype },
          })
        : info.jobtype,
    },

    // TODO: when https://github.com/elastic/kibana/pull/106137 is merged, add kibana version field
  ];

  const jobScreenshot = [
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.dimensionsInfo', {
        defaultMessage: 'Dimensions',
      }),
      description: getDimensions(info),
    },
    {
      title: i18n.translate('xpack.reporting.listing.infoPanel.layoutInfo', {
        defaultMessage: 'Layout',
      }),
      description: info.layout?.id || UNKNOWN,
    },
  ];

  const warnings = info.getWarnings();
  const warningsInfo = warnings && [
    {
      title: <EuiText color="danger">Warnings</EuiText>,
      description: <EuiText color="warning">{warnings}</EuiText>,
    },
  ];

  const errored = info.getError();
  const errorInfo = errored && [
    {
      title: <EuiText color="danger">Error</EuiText>,
      description: <EuiText color="danger">{errored}</EuiText>,
    },
  ];

  return (
    <>
      <EuiDescriptionList listItems={jobInfo} type="column" align="center" compressed />
      <EuiSpacer size="s" />
      <EuiDescriptionList listItems={processingInfo} type="column" align="center" compressed />
      {USES_HEADLESS_JOB_TYPES.includes(info.jobtype) ? (
        <>
          <EuiSpacer size="s" />
          <EuiDescriptionList listItems={jobScreenshot} type="column" align="center" compressed />
        </>
      ) : null}
      {warningsInfo ? (
        <>
          <EuiSpacer size="s" />
          <EuiDescriptionList listItems={warningsInfo} type="column" align="center" compressed />
        </>
      ) : null}
      {errorInfo ? (
        <>
          <EuiSpacer size="s" />
          <EuiDescriptionList listItems={errorInfo} type="column" align="center" compressed />
        </>
      ) : null}
    </>
  );
};
