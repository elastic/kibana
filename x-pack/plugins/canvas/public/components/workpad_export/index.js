/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint import/no-unresolved: 1 */
// TODO: remove eslint rule when updating to use the linked kibana resolve package
import { jobCompletionNotifications } from 'plugins/reporting/lib/job_completion_notifications';
import React from 'react';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { FormattedMessage } from '@kbn/i18n/react';
import { getWorkpad, getPages } from '../../state/selectors/workpad';
import { getReportingBrowserType } from '../../state/selectors/app';
import { notify } from '../../lib/notify';
import { getWindow } from '../../lib/get_window';
import { WorkpadExport as Component } from './workpad_export';
import { getPdfUrl, createPdf } from './utils';

const mapStateToProps = state => ({
  workpad: getWorkpad(state),
  pageCount: getPages(state).length,
  enabled: getReportingBrowserType(state) === 'chromium',
});

const getAbsoluteUrl = path => {
  const { location } = getWindow();
  if (!location) return path; // fallback for mocked window object

  const { protocol, hostname, port } = location;
  return `${protocol}//${hostname}:${port}${path}`;
};

export const WorkpadExport = compose(
  connect(mapStateToProps),
  withProps(({ workpad, pageCount }) => ({
    getExportUrl: type => {
      if (type === 'pdf') return getAbsoluteUrl(getPdfUrl(workpad, { pageCount }));

      throw new Error(
        (
          <FormattedMessage
            id="xpack.canvas.workpad.export.pdfLinkErrorMessage"
            defaultMessage="Unknown export type: {errorMessage}"
            values={{ errorMessage: type }}
          />
        )
      );
    },
    onCopy: type => {
      if (type === 'pdf') {
        return notify.info(
          <FormattedMessage
            id="xpack.canvas.workpad.export.pdfLinkCopiedToClipboardMessage"
            defaultMessage="The PDF generation URL was copied to your clipboard."
          />
        );
      }
      throw new Error(
        (
          <FormattedMessage
            id="xpack.canvas.workpad.export.pdfLinkCopiedToClipboardErrorMessage"
            defaultMessage="Unknown export type: {errorMessage}"
            values={{ errorMessage: type }}
          />
        )
      );
    },
    onExport: type => {
      if (type === 'pdf') {
        return createPdf(workpad, { pageCount })
          .then(({ data }) => {
            notify.info(
              <FormattedMessage
                id="xpack.canvas.workpad.export.pdfExportedStatusMessage"
                defaultMessage="Exporting PDF. You can track the progress in Management."
              />,
              {
                title: (
                  <FormattedMessage
                    id="xpack.canvas.workpad.export.pdfExportedWorkpadTitle"
                    defaultMessage="PDF export of workpad {workpadName}"
                    values={{ workpadName: workpad.name }}
                  />
                ),
              }
            );

            // register the job so a completion notification shows up when it's ready
            jobCompletionNotifications.add(data.job.id);
          })
          .catch(err => {
            notify.error(err, {
              title: (
                <FormattedMessage
                  id="xpack.canvas.workpad.export.pdfExportErrorWorkpadTitle"
                  defaultMessage="Failed to create PDF for {workpadName}"
                  values={{ workpadName: workpad.name }}
                />
              ),
            });
          });
      }
      throw new Error(
        (
          <FormattedMessage
            id="xpack.canvas.workpad.export.pdfExportErrorMessage"
            defaultMessage="Unknown export type: {errorMessage}"
            values={{ errorMessage: type }}
          />
        )
      );
    },
  }))
)(Component);
