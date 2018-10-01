/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint import/no-unresolved: 1 */
// TODO: remove eslint rule when updating to use the linked kibana resolve package
import { jobCompletionNotifications } from 'plugins/reporting/lib/job_completion_notifications';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { injectI18n } from '@kbn/i18n/react';
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

const WorkpadExportUI = compose(
  connect(mapStateToProps),
  withProps(({ workpad, pageCount, intl }) => ({
    getExportUrl: type => {
      if (type === 'pdf') return getAbsoluteUrl(getPdfUrl(workpad, { pageCount }));

      throw new Error(
        intl.formatMessage(
          {
            id: 'xpack.canvas.workpadExport.unknownExportTypeErrorMessage',
            defaultMessage: 'Unknown export type: {errorMessage}',
          },
          {
            errorMessage: type,
          }
        )
      );
    },
    onCopy: type => {
      if (type === 'pdf') {
        return notify.info(
          intl.formatMessage({
            id: 'xpack.canvas.workpadExport.pdfLinkCopiedToClipboardMessage',
            defaultMessage: 'The PDF generation URL was copied to your clipboard.',
          })
        );
      }
      throw new Error(
        intl.formatMessage(
          {
            id: 'xpack.canvas.workpadExport.unknownExportTypeErrorMessage',
            defaultMessage: 'Unknown export type: {errorMessage}',
          },
          {
            errorMessage: type,
          }
        )
      );
    },
    onExport: type => {
      if (type === 'pdf') {
        return createPdf(workpad, { pageCount })
          .then(({ data }) => {
            notify.info(
              intl.formatMessage({
                id: 'xpack.canvas.workpadExport.pdfExportedStatusMessage',
                defaultMessage: 'Exporting PDF. You can track the progress in Management.',
              }),
              {
                title: intl.formatMessage(
                  {
                    id: 'xpack.canvas.workpadExport.pdfExportedWorkpadTitle',
                    defaultMessage: "PDF export of workpad '{workpadName}'",
                  },
                  {
                    errorMessage: type,
                  }
                ),
              }
            );

            // register the job so a completion notification shows up when it's ready
            jobCompletionNotifications.add(data.job.id);
          })
          .catch(err => {
            notify.error(err, {
              title: intl.formatMessage(
                {
                  id: 'xpack.canvas.workpadExport.pdfExportErrorWorkpadTitle',
                  defaultMessage: "Failed to create PDF for '{workpadName}'",
                },
                {
                  workpadName: workpad.name,
                }
              ),
            });
          });
      }
      throw new Error(
        intl.formatMessage(
          {
            id: 'xpack.canvas.workpadExport.unknownExportTypeErrorMessage',
            defaultMessage: 'Unknown export type: {errorMessage}',
          },
          {
            errorMessage: type,
          }
        )
      );
    },
  }))
)(Component);

export const WorkpadExport = injectI18n(WorkpadExportUI);
